// Thực thể của bài, khóa ngoại, cạnh dữ liệu, nhóm — spec 11 Mục 11.1 (ENG-116 … ENG-119), D-84, D-85.
import type { Node } from "web-tree-sitter";
import type { EntityOp, GraphEdge, HybridArchitecturalNode, StaticEngineResult } from "@/contracts";
import { normalizeTokens, slug } from "./naming";
import { isDataAccessFile, isDataSinkCall, PRISMA_RECEIVER_SEGMENTS } from "./slicing";
import type { Candidate, EngineContext, ExternalCall, ParsedFile } from "./types";

export interface LessonEntity {
  ops: Set<EntityOp>;
  fromCode: boolean;
}

export interface LessonData {
  entities: Map<string, LessonEntity>;
  primary: string | null;
}

export interface DataEdge {
  source: string;
  target: string;
  via: Set<string>;
}

const OP_ORDER: EntityOp[] = ["CREATE", "READ", "UPDATE", "DELETE"];
const ROLE_SUFFIX = /(repository|repositories|repos|repo|daos|dao|models|model|entities|entity)$/i;
// ACTION_SEGMENTS (spec 11 Mục 13) trừ `register`: bài tạo tài khoản vẫn là CREATE.
const READ_ACTIONS = new Set(["cancel", "login", "logout", "search", "verify", "refresh", "reset", "health"]);

function toEntityName(raw: string): string | null {
  const name = normalizeTokens(raw).join("");
  return name.length > 0 ? name : null;
}

function withoutRoleSuffix(raw: string): string {
  return raw.replace(ROLE_SUFFIX, "").replace(/[-_.]+$/, "");
}

const fieldEntityCache = new WeakMap<ParsedFile, Map<string, string>>();

// ENG-116 (c): `T` của Repository<T>, JpaRepository<T, …>, @InjectRepository(T) theo tên field.
function fieldEntities(file: ParsedFile): Map<string, string> {
  const cached = fieldEntityCache.get(file);
  if (cached) return cached;
  const result = new Map<string, string>();
  const visit = (n: Node): void => {
    if (n.type === "required_parameter" || n.type === "optional_parameter" || n.type === "public_field_definition") {
      const nameNode = n.childForFieldName("pattern") ?? n.childForFieldName("name");
      const match = /(?:Jpa)?Repository<\s*(\w+)|InjectRepository\(\s*(\w+)/.exec(n.text);
      if (nameNode && match) result.set(nameNode.text, (match[1] ?? match[2]) as string);
    }
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) visit(child);
    }
  };
  if (file.tree) visit(file.tree.rootNode);
  fieldEntityCache.set(file, result);
  return result;
}

function nameFromCall(call: ExternalCall, ctx: EngineContext): string | null {
  const chain = call.receiver_chain[0] === "this" ? call.receiver_chain.slice(1) : call.receiver_chain;
  const last = chain[chain.length - 1] ?? "";

  // (a) đoạn sau prisma, tx, trx
  const prismaAt = chain.findIndex((seg) => PRISMA_RECEIVER_SEGMENTS.has(seg));
  if (prismaAt >= 0) {
    const model = chain[prismaAt + 1];
    if (model && !model.startsWith("$")) return toEntityName(model);
  }

  // (b) receiver viết hoa (mẫu c)
  const hasOrm = ctx.tech_stack.some((t) => ["mongoose", "sequelize", "typeorm"].includes(t.toLowerCase()));
  if (hasOrm && last.length > 0 && last[0] === last[0]!.toUpperCase() && last[0] !== last[0]!.toLowerCase()) {
    return toEntityName(withoutRoleSuffix(last) || last);
  }

  const callerFile = call.caller.split("#")[0] ?? "";
  const file = ctx.files.get(callerFile);

  // (c) kiểu của field receiver
  const fromField = file ? fieldEntities(file).get(last) : undefined;
  if (fromField) return toEntityName(fromField);

  // (d) đoạn cuối receiver có đuôi ENG-82
  if (ROLE_SUFFIX.test(last)) {
    const stem = withoutRoleSuffix(last);
    if (stem.length > 0) return toEntityName(stem);
  }

  // (e) file có segment ENG-82 ⇒ tên lớp bỏ đuôi, thiếu lớp ⇒ stem file
  if (isDataAccessFile(callerFile)) {
    const local = call.caller.slice(call.caller.indexOf("#") + 1);
    const className = local.includes(".") ? local.split(".")[0] ?? "" : "";
    const base = callerFile.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
    return toEntityName(withoutRoleSuffix(className || base));
  }
  return null;
}

function opOf(method: string): EntityOp | null {
  if (/^(create|insert.*|add|upsert|save)$/i.test(method)) return "CREATE";
  if (/^update.*$/i.test(method)) return "UPDATE";
  if (/^(delete.*|remove)$/i.test(method)) return "DELETE";
  if (/^(find.*|get|count|aggregate|query)$/i.test(method)) return "READ";
  return null;
}

// Mục 13 bậc 1: đoạn tĩnh của path.
function staticSegments(path: string): string[] {
  return path
    .split("/")
    .filter((seg) => seg.length > 0 && /^[A-Za-z0-9_-]+$/.test(seg))
    .filter((seg) => seg.toLowerCase() !== "api" && !/^v\d+$/i.test(seg));
}

function routeEntity(c: Candidate): [string, EntityOp] | null {
  const binding = c.binding;
  if (!binding || binding.kind !== "HTTP" || !binding.path) return null;
  const segments = staticSegments(binding.path);
  const first = segments[0];
  if (!first) return null;
  const name = toEntityName(first);
  if (!name) return null;
  const method = (binding.method ?? "").toUpperCase();
  const lastSegment = (segments[segments.length - 1] ?? "").toLowerCase();
  if (method === "POST") return [name, READ_ACTIONS.has(lastSegment) ? "READ" : "CREATE"];
  if (method === "GET") return [name, "READ"];
  if (method === "PUT" || method === "PATCH") return [name, "UPDATE"];
  if (method === "DELETE") return [name, "DELETE"];
  return null;
}

/** ENG-116: thực thể và thao tác của 1 bài. Node thuật toán, node ảo không có thực thể. */
export function readLessonData(c: Candidate, ctx: EngineContext): LessonData {
  const entities = new Map<string, LessonEntity>();
  let firstName: string | null = null;
  let firstWrite: string | null = null;
  if (c.kind !== "SLICE") return { entities, primary: null };

  for (const fnKey of c.functions) {
    const calls = ctx.external
      .filter((ext) => ext.caller === fnKey && isDataSinkCall(ext, ctx.tech_stack))
      .sort((a, b) => a.line - b.line);
    for (const call of calls) {
      const name = nameFromCall(call, ctx);
      let op = opOf(call.method);
      if (!name || !op) continue;
      const entity = entities.get(name) ?? { ops: new Set<EntityOp>(), fromCode: true };
      if (call.method.toLowerCase() === "save" && entity.ops.has("READ")) op = "UPDATE";
      entity.ops.add(op);
      entities.set(name, entity);
      firstName ??= name;
      if (op !== "READ") firstWrite ??= name;
    }
  }

  if (entities.size === 0) {
    const fromRoute = routeEntity(c);
    if (fromRoute) {
      const [name, op] = fromRoute;
      entities.set(name, { ops: new Set([op]), fromCode: false });
      firstName = name;
    }
  }
  return { entities, primary: firstWrite ?? firstName };
}

function foreignKeysFromPrisma(text: string, add: (from: string, to: string) => void): void {
  let model: string | null = null;
  for (const line of text.split("\n")) {
    const open = /^\s*model\s+(\w+)\s*\{/.exec(line);
    if (open) {
      model = open[1] ?? null;
      continue;
    }
    if (/^\s*\}/.test(line)) {
      model = null;
      continue;
    }
    const field = /^\s*\w+\s+(\w+)(\[\])?\??\s+.*@relation/.exec(line);
    if (model && field?.[1] && !field[2]) add(model, field[1]);
  }
}

function foreignKeysFromClasses(file: ParsedFile, add: (from: string, to: string) => void): void {
  const typeName = (n: Node | null): string => /\w+/.exec((n?.text ?? "").replace(/^:\s*/, ""))?.[0] ?? "";
  const visit = (n: Node): void => {
    if (n.type === "class_declaration") {
      const className = n.childForFieldName("name")?.text ?? "";
      const body = n.childForFieldName("body");
      let pending = false;
      for (let i = 0; body && i < body.namedChildCount; i++) {
        const member = body.namedChild(i);
        if (!member) continue;
        if (member.type === "decorator") {
          pending = pending || member.text.includes("ManyToOne");
          continue;
        }
        if (member.type === "public_field_definition" || member.type === "field_declaration") {
          if (pending || member.text.includes("ManyToOne")) {
            const target = typeName(member.childForFieldName("type"));
            if (className && target) add(className, target);
          }
        }
        pending = false;
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) visit(child);
    }
  };
  if (file.tree && file.source.includes("ManyToOne")) visit(file.tree.rootNode);
}

/** ENG-117: khóa ngoại E → P theo `@relation` của `schema.prisma`, `@ManyToOne` của TypeORM, JPA. */
export function readForeignKeys(ctx: EngineContext): Map<string, Set<string>> {
  const keys = new Map<string, Set<string>>();
  const add = (from: string, to: string): void => {
    const e = toEntityName(from);
    const p = toEntityName(to);
    if (!e || !p || e === p) return;
    const set = keys.get(e) ?? new Set<string>();
    set.add(p);
    keys.set(e, set);
  };
  for (const [path, text] of ctx.manifests ?? []) {
    if (path === "schema.prisma" || path.endsWith("/schema.prisma")) foreignKeysFromPrisma(text, add);
  }
  for (const file of ctx.files.values()) foreignKeysFromClasses(file, add);
  return keys;
}

/** ENG-118 (1), (2): nguồn của thực thể nối tới mọi bài dùng nó, bài tạo nhận cạnh qua khóa ngoại. */
export function buildDataEdges(
  lessons: Array<{ id: string; data: LessonData }>,
  foreignKeys: Map<string, Set<string>>,
  isEasier: (a: string, b: string) => boolean
): Map<string, DataEdge> {
  const users = new Map<string, string[]>();
  for (const lesson of lessons) {
    for (const name of lesson.data.entities.keys()) {
      users.set(name, [...(users.get(name) ?? []), lesson.id]);
    }
  }
  const byId = new Map(lessons.map((l) => [l.id, l.data]));
  const easiest = (ids: string[]): string | null =>
    ids.reduce<string | null>((best, id) => (best === null || isEasier(id, best) ? id : best), null);

  const sourceOf = (name: string): string | null => {
    const ids = users.get(name) ?? [];
    const creates = (fromCode: boolean) =>
      ids.filter((id) => {
        const entity = byId.get(id)?.entities.get(name);
        return entity?.ops.has("CREATE") && entity.fromCode === fromCode;
      });
    return easiest(creates(true)) ?? easiest(creates(false)) ?? easiest(ids);
  };

  const edges = new Map<string, DataEdge>();
  const add = (source: string, target: string, entity: string): void => {
    const key = `${source}->${target}`;
    const edge = edges.get(key) ?? { source, target, via: new Set<string>() };
    edge.via.add(entity);
    edges.set(key, edge);
  };

  for (const name of Array.from(users.keys()).sort()) {
    const source = sourceOf(name);
    if (!source) continue;
    for (const id of users.get(name) ?? []) {
      if (id !== source) add(source, id, name);
    }
  }
  for (const lesson of lessons) {
    for (const [name, entity] of lesson.data.entities) {
      if (!entity.ops.has("CREATE")) continue;
      for (const parent of Array.from(foreignKeys.get(name) ?? []).sort()) {
        const source = sourceOf(parent);
        if (source && source !== lesson.id) add(source, lesson.id, parent);
      }
    }
  }
  return edges;
}

export function toNodeEntities(data: LessonData | undefined): HybridArchitecturalNode["entities"] {
  if (!data) return [];
  return Array.from(data.entities.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, entity]) => ({ name, ops: OP_ORDER.filter((op) => entity.ops.has(op)) }));
}

/** ENG-119: gom bài thành nhóm, gán `group_id` cho node. */
export function buildGroups(
  nodes: HybridArchitecturalNode[],
  edges: GraphEdge[],
  dataById: Map<string, LessonData>
): StaticEngineResult["groups"] {
  const parents = new Map<string, string[]>();
  const connected = new Set<string>();
  for (const edge of edges) {
    parents.set(edge.target, [...(parents.get(edge.target) ?? []), edge.source]);
    connected.add(edge.source);
    connected.add(edge.target);
  }
  const depths = new Map<string, number>();
  const depthOf = (id: string): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    depths.set(id, 0);
    const depth = Math.max(-1, ...(parents.get(id) ?? []).map(depthOf)) + 1;
    depths.set(id, depth);
    return depth;
  };

  const readFromCode = new Set<string>();
  for (const node of nodes) {
    for (const [name, entity] of dataById.get(node.id)?.entities ?? []) {
      if (entity.fromCode) readFromCode.add(name);
    }
  }

  const groups = new Map<string, StaticEngineResult["groups"][number]>();
  for (const node of nodes) {
    const primary = dataById.get(node.id)?.primary ?? null;
    const standalone = node.node_type === "ALGORITHMIC_CORE" || !connected.has(node.id) || primary === null;
    const key = standalone ? "Học riêng" : primary;
    const kind = standalone ? "STANDALONE" : readFromCode.has(primary) ? "ENTITY" : "ROUTE_PREFIX";
    const groupId =
      kind === "STANDALONE"
        ? "group-standalone"
        : `group-${kind === "ENTITY" ? "entity" : "route"}-${slug(key)}`;
    const group = groups.get(groupId) ?? { group_id: groupId, key, key_kind: kind, node_ids: [] };
    group.node_ids.push(node.id);
    groups.set(groupId, group);
    node.group_id = groupId;
  }

  const byDepth = (a: string, b: string) => depthOf(a) - depthOf(b) || (a < b ? -1 : a > b ? 1 : 0);
  const minDepth = (ids: string[]) => Math.min(...ids.map(depthOf));
  const list = Array.from(groups.values());
  for (const group of list) group.node_ids.sort(byDepth);
  return list.sort((a, b) => {
    const aLone = a.key_kind === "STANDALONE" ? 1 : 0;
    const bLone = b.key_kind === "STANDALONE" ? 1 : 0;
    if (aLone !== bLone) return aLone - bLone;
    const diff = minDepth(a.node_ids) - minDepth(b.node_ids);
    if (diff !== 0) return diff;
    return a.group_id < b.group_id ? -1 : a.group_id > b.group_id ? 1 : 0;
  });
}
