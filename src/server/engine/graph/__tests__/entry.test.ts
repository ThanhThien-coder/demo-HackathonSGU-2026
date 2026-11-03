// Test nhận diện entry màn hình React Native, Expo Router, entry chương trình main, và quy ước export — spec 11 T-ENG-39, T-ENG-40; spec 12 T-ENT-01, T-ENT-02.
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as fflate from "fflate";
import type { IngestionReport, LanguageId } from "@/contracts";
import { runEngine } from "../../index";
import { initParsers, parseAll } from "../parser";
import { collectSymbols, resolveImports } from "../symbols";
import { buildCallGraph, findEntries } from "../callgraph";

vi.setConfig({ testTimeout: 30_000 });

function createEmptyReport(): IngestionReport {
  return {
    truncated: false,
    selective_fetch: false,
    code_file_count: 0,
    manifest_count: 0,
    omitted_node_count: 0,
    skipped: {
      garbage: 0,
      binary: 0,
      oversized: 0,
      unsupported_lang: 0,
      quota: 0,
      parse_error: 0,
    },
    warnings: [],
    degraded_mode: null,
    redacted_secret_count: 0,
    engine_ms: 0,
    ingest_ms: 0,
    suspicious_instruction_files: [],
  };
}

describe("T-ENG-39: Repo Expo Router có màn hình và archetype MOBILE_APP", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("T-ENG-39: Repo Expo Router có app/(tabs)/index.tsx export default, entry REGISTERED (SCREEN), archetype MOBILE_APP", async () => {
    const zipBytes = fflate.zipSync({
      "package.json": fflate.strToU8(
        JSON.stringify({
          name: "example-expo-mobile",
          dependencies: {
            "expo": "^51.0.0",
            "expo-router": "^3.5.0",
            "react-native": "0.74.1",
          },
        })
      ),
      "app/_layout.tsx": fflate.strToU8(`
import React from 'react';
export default function Layout() {
  return null;
}
`),
      "app/(tabs)/index.tsx": fflate.strToU8(`
import React from 'react';
import { View, Text } from 'react-native';
import { greetUser } from '../../services/greet';

export default function HomeScreen() {
  const message = greetUser("Developer");
  return (
    <View>
      <Text>{message}</Text>
    </View>
  );
}
`),
      "services/greet.ts": fflate.strToU8(`
export function greetUser(name: string): string {
  return "Hello " + name;
}
`),
      "services/calc.ts": fflate.strToU8(`
export function calculateSum(nums: number[]): number {
  let sum = 0;
  for (const n of nums) {
    if (n > 0) {
      sum += n;
    }
  }
  return sum;
}
`),
      "services/auth.ts": fflate.strToU8(`
export function checkSession(): boolean {
  return true;
}
`),
      "services/storage.ts": fflate.strToU8(`
export function saveToken(token: string): { saved: boolean } {
  return { saved: token.length > 0 };
}
`),
      "services/profile.ts": fflate.strToU8(`
export function getProfile(): { username: string } {
  return { username: "expo-user" };
}
`),
    });

    const result = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "example-expo-mobile.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    // 1. Archetype là MOBILE_APP
    expect(result.fingerprint.archetype).toBe("MOBILE_APP");

    // 2. Có node bắt đầu từ màn hình app/(tabs)/index.tsx
    const homeNode = result.nodes.find(
      (n) =>
        n.files[0] === "app/(tabs)/index.tsx" ||
        n.trace_steps[0]?.file_path === "app/(tabs)/index.tsx"
    );
    expect(homeNode).toBeDefined();
    expect(homeNode?.entry_symbol).toContain("app/(tabs)/index.tsx");
    expect(homeNode?.trace_steps[0]?.layer).toBe("ENTRY_POINT");
    expect(homeNode?.trace_steps[0]?.file_path).toBe("app/(tabs)/index.tsx");
  });
});

describe("T-ENG-40: Repo Python có entry chương trình __main__", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("T-ENG-40: Repo Python > CONFIG.PROCEDURAL_MAX_FILES file, cli.py có if __name__ == '__main__':, entry PROGRAM, chế độ NORMAL", async () => {
    // 7 file Python trong scope (lớn hơn CONFIG.PROCEDURAL_MAX_FILES = 2), không framework
    const zipBytes = fflate.zipSync({
      "requirements.txt": fflate.strToU8("# No framework dependencies\n"),
      "cli.py": fflate.strToU8(`
import sys
from task_service import execute_pipeline

if __name__ == "__main__":
    execute_pipeline("start")
`),
      "task_service.py": fflate.strToU8(`
from worker import process_job

def execute_pipeline(payload):
    result = process_job(payload)
    print("Pipeline result:", result)
    return result
`),
      "worker.py": fflate.strToU8(`
def process_job(job_id):
    return "completed_" + str(job_id)
`),
      "algo_alpha.py": fflate.strToU8(`
def compute_alpha(n):
    total = 0
    for i in range(n):
        if i % 2 == 0:
            total += i
        else:
            total += 1
    return total
`),
      "algo_beta.py": fflate.strToU8(`
def compute_beta(n):
    product = 1
    for i in range(1, n + 1):
        if i % 3 == 0:
            product *= i
    return product
`),
      "algo_gamma.py": fflate.strToU8(`
def compute_gamma(n):
    val = 0
    for i in range(n):
        if i > 5:
            val += i
    return val
`),
      "algo_delta.py": fflate.strToU8(`
def compute_delta(n):
    out = []
    for i in range(n):
        out.append(i)
    return out
`),
    });

    const result = await runEngine({
      kind: "ZIP_UPLOAD",
      file_name: "example-python-cli.zip",
      bytes: zipBytes,
      subdir_override: null,
    });

    // 1. Chế độ NORMAL (degraded_mode = null)
    expect(result.ingestion_report.degraded_mode).toBeNull();

    // 2. Có node bắt đầu từ khối __main__ của cli.py
    const mainNode = result.nodes.find(
      (n) => n.trace_steps[0]?.file_path === "cli.py"
    );
    expect(mainNode).toBeDefined();
    expect(mainNode?.entry_symbol).toBe("cli.py#<module>");
    expect(mainNode?.trace_steps[0]?.snippet).toContain("__main__");
  });
});

describe("T-ENT-01: Nhận diện mẫu Screen và Route", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("T-ENT-01: React Native Tab.Screen nhận diện component handler là SCREEN", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    code.set(
      "src/navigation.tsx",
      `
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SettingsScreen } from './screens/settings';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
`
    );
    langs.set("src/navigation.tsx", "TSX");

    code.set(
      "src/screens/settings.tsx",
      `
import React from 'react';
import { View, Text } from 'react-native';

export function SettingsScreen() {
  return (
    <View>
      <Text>Settings</Text>
    </View>
  );
}
`
    );
    langs.set("src/screens/settings.tsx", "TSX");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const cg = buildCallGraph(parsed, idx);
    const tabBinding = cg.bindings.find((b) => b.kind === "SCREEN");

    expect(tabBinding).toBeDefined();
    expect(tabBinding?.kind).toBe("SCREEN");
    expect(tabBinding?.path).toBe("/Settings");
    expect(tabBinding?.handler).toBe("src/screens/settings.tsx#SettingsScreen");
  });

  it("T-ENT-01: Expo Router app/(tabs)/settings.tsx nhận diện path là /settings", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    code.set(
      "app/(tabs)/settings.tsx",
      `
import React from 'react';
import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View>
      <Text>Settings</Text>
    </View>
  );
}
`
    );
    langs.set("app/(tabs)/settings.tsx", "TSX");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const cg = buildCallGraph(parsed, idx);
    const expoBinding = cg.bindings.find((b) => b.kind === "SCREEN");

    expect(expoBinding).toBeDefined();
    expect(expoBinding?.kind).toBe("SCREEN");
    expect(expoBinding?.path).toBe("/settings");
  });

  it.todo(
    "T-ENT-01: routes: {'/cart': (_) => CartPage()} (Dart Flutter) — chưa có grammar ở public/grammars/"
  );
  it.todo(
    "T-ENT-01: MainActivity : ComponentActivity() (Kotlin Android) — chưa có grammar ở public/grammars/"
  );
  it.todo(
    "T-ENT-01: LoginVC: UIViewController (Swift iOS) — chưa có grammar ở public/grammars/"
  );
});

describe("T-ENT-02: Quy ước export và entry chương trình", () => {
  beforeAll(async () => {
    await initParsers();
  });

  it("T-ENT-02: Python hàm _helper không export, public_api có export", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    code.set(
      "utils.py",
      `
def _helper():
    return 42

def public_api():
    return _helper()
`
    );
    langs.set("utils.py", "PYTHON");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);

    const helperSym = idx.symbols.get("utils.py#_helper");
    const apiSym = idx.symbols.get("utils.py#public_api");

    expect(helperSym).toBeDefined();
    expect(helperSym?.is_exported).toBe(false);

    expect(apiSym).toBeDefined();
    expect(apiSym?.is_exported).toBe(true);
  });

  it("T-ENT-02: Hàm main có thân trong TS/JS là entry PROGRAM", async () => {
    const report = createEmptyReport();
    const code = new Map<string, string>();
    const langs = new Map<string, LanguageId>();

    code.set(
      "index.ts",
      `
export function main(): void {
  console.log("Starting service");
}
`
    );
    langs.set("index.ts", "TYPESCRIPT");

    const parsed = await parseAll(code, langs, report);
    const idx = collectSymbols(parsed);
    resolveImports(parsed, idx, new Map(), {
      go_module_path: null,
      dart_package_name: null,
      package_entry_files: [],
    });

    const cg = buildCallGraph(parsed, idx);
    const entries = findEntries(parsed, idx, cg, "");

    const programEntry = entries.find((e) => e.source === "PROGRAM");
    expect(programEntry).toBeDefined();
    expect(programEntry?.key).toBe("index.ts#main");
  });

  it.todo(
    "T-ENT-02: Repo C lớn, int main, 0 route (C) — chưa có grammar ở public/grammars/"
  );
  it.todo(
    "T-ENT-02: Controllers/OrderController.cs (C#) — chưa có grammar ở public/grammars/"
  );
  it.todo(
    "T-ENT-02: Go helper không export (Go) — chưa có grammar ở public/grammars/"
  );
});

// ENG-81: callee lá trả giá trị được dùng ở call site (`const p = loadProducts()`) phải được giữ. Lần tập (B10):
// lát cắt màn hình Expo/React Navigation chỉ còn 1 bước vì ENG-81 bị cài thành "callee có gọi tiếp" và tìm
// throw trong cả file thay vì thân hàm.
describe("ENG-81: lát cắt màn hình đi tới hàm lá có giá trị trả về được dùng", () => {
  const pkg = (deps: Record<string, string>) => JSON.stringify({ name: "x", dependencies: deps });
  async function runZip(files: Record<string, string>) {
    const zip = fflate.zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, fflate.strToU8(v)])));
    return runEngine({ kind: "ZIP_UPLOAD", file_name: "m.zip", bytes: zip, subdir_override: null });
  }
  it("ENG-81: Expo Router app/(tabs)/index.tsx ⇒ ENTRY_POINT > fetchProducts", async () => {
    const r = await runZip({
      "package.json": pkg({ expo: "^50", "expo-router": "^3", "react-native": "^0.73" }),
      "app/(tabs)/index.tsx": "import { fetchProducts } from '../../lib/api';\nexport default function Home() {\n  const items = fetchProducts();\n  return items;\n}\n",
      "lib/api.ts": "export function fetchProducts() {\n  return fetch('https://x/api/products');\n}\n",
    });
    expect(r.nodes[0]?.trace_steps.map((s) => s.function_name)).toEqual(["Screen /", "fetchProducts"]);
  }, 30_000);
  it("ENG-81: <Tab.Screen component={HomeScreen}> ⇒ ENTRY_POINT > loadProducts", async () => {
    const r = await runZip({
      "package.json": pkg({ "react-native": "^0.73", "@react-navigation/bottom-tabs": "^6" }),
      "src/App.tsx": "import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';\nimport { HomeScreen } from './screens/HomeScreen';\nconst Tab = createBottomTabNavigator();\nexport default function App() {\n  return (\n    <Tab.Navigator>\n      <Tab.Screen name=\"Home\" component={HomeScreen} />\n    </Tab.Navigator>\n  );\n}\n",
      "src/screens/HomeScreen.tsx": "import { loadProducts } from '../services/product.service';\nexport function HomeScreen() {\n  const p = loadProducts();\n  return p;\n}\n",
      "src/services/product.service.ts": "export function loadProducts() {\n  return fetch('/api/products');\n}\n",
    });
    expect(r.nodes.find((n) => n.title === "Home Screen")?.trace_steps.map((s) => s.function_name)).toEqual(['<Tab.Screen name="Home">', "loadProducts"]);
  }, 30_000);
});
