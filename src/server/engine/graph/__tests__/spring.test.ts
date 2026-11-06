import { beforeAll, describe, expect, it } from "vitest";
import { CONFIG } from "@/contracts";
import { createParser, initParsers } from "../parser";
import { collectSymbols, resolveImports } from "../symbols";
import { buildCallGraph } from "../callgraph";
import { buildSlice } from "../slicing";
import { buildJavaCallGraph, isJavaTestSource, isSpringDataAccessFile } from "../spring";
import { cognitiveComplexity } from "../complexity";
import { buildAlgoCandidates } from "../nodes";
import type { EngineContext, ParsedFile } from "../types";

function parseJavaFile(path: string, source: string): ParsedFile {
  const parser = createParser("JAVA");
  const tree = parser.parse(source);
  if (!tree) {
    throw new Error(`Parse thất bại: ${path}`);
  }
  return {
    path,
    language: "JAVA",
    tier: "RESOLVED",
    tree,
    source,
  };
}

describe("Spring Boot & Java Call Graph (TASK_24)", () => {
  beforeAll(async () => {
    await initParsers();
  });

  describe("T-ENT-04: Route Spring Boot theo spec 12", () => {
    it("T-ENT-04 nhận diện đúng 3 route theo spec 12: GET /owners/{id}, POST /x, ALL /y", () => {
      const ownerSource = `
package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/owners")
public class OwnerController {

    @GetMapping("/{id}")
    public String getOwner(@PathVariable("id") int id) {
        return "owner";
    }
}
`;
      const otherSource = `
package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
public class OtherController {

    @RequestMapping(value = "/x", method = RequestMethod.POST)
    public String createX() {
        return "x";
    }

    @RequestMapping("/y")
    public String allY() {
        return "y";
    }
}
`;
      const file1 = parseJavaFile("src/main/java/com/example/demo/OwnerController.java", ownerSource);
      const file2 = parseJavaFile("src/main/java/com/example/demo/OtherController.java", otherSource);
      const files = [file1, file2];
      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);
      expect(result.bindings).toHaveLength(3);

      const b0 = result.bindings.find((b) => b.display_name === '@GetMapping("/owners/{id}")');
      expect(b0).toBeDefined();
      expect(b0?.kind).toBe("HTTP");
      expect(b0?.method).toBe("GET");
      expect(b0?.path).toBe("/owners/{id}");
      expect(b0?.handler).toContain("OwnerController.getOwner");
      expect(b0?.middlewares).toEqual([]);

      const b1 = result.bindings.find((b) => b.display_name === '@RequestMapping("/x")');
      expect(b1).toBeDefined();
      expect(b1?.kind).toBe("HTTP");
      expect(b1?.method).toBe("POST");
      expect(b1?.path).toBe("/x");
      expect(b1?.handler).toContain("OtherController.createX");

      const b2 = result.bindings.find((b) => b.display_name === '@RequestMapping("/y")');
      expect(b2).toBeDefined();
      expect(b2?.kind).toBe("HTTP");
      expect(b2?.method).toBe("ALL");
      expect(b2?.path).toBe("/y");
      expect(b2?.handler).toContain("OtherController.allY");
    });

    it("T-ENT-04 nhận diện route không có class prefix, @Controller thường và lớp lồng nhau", () => {
      const source = `
package com.example.demo;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
public class HomeController {

    @PostMapping("/submit")
    public String submitForm() {
        return "ok";
    }

    @RestController
    @RequestMapping("/nested")
    public static class InnerController {
        @GetMapping("/item")
        public String getItem() {
            return "item";
        }
    }
}
`;
      const file = parseJavaFile("src/main/java/com/example/demo/HomeController.java", source);
      const files = [file];
      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);
      expect(result.bindings).toHaveLength(2);

      const postBinding = result.bindings.find((b) => b.method === "POST");
      expect(postBinding).toBeDefined();
      expect(postBinding?.path).toBe("/submit");
      expect(postBinding?.display_name).toBe('@PostMapping("/submit")');

      const nestedBinding = result.bindings.find((b) => b.method === "GET");
      expect(nestedBinding).toBeDefined();
      expect(nestedBinding?.path).toBe("/nested/item");
      expect(nestedBinding?.display_name).toBe('@GetMapping("/nested/item")');
    });

    it("T-ENT-04 chuẩn hóa path không có hằng chuỗi tĩnh thành rỗng", () => {
      const source = `
package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(Constants.BASE_PATH)
public class ConstController {

    @GetMapping(Constants.ITEM_PATH)
    public String getItem() {
        return "ok";
    }
}
`;
      const file = parseJavaFile("src/main/java/com/example/demo/ConstController.java", source);
      const files = [file];
      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);
      expect(result.bindings).toHaveLength(1);
      const b = result.bindings[0];
      expect(b?.path).toBe("/");
      expect(b?.display_name).toBe('@GetMapping("/")');
    });
  });

  describe("T-ENT-05: Spring Data JPA Repository & EntityManager DATA_SINK", () => {
    it("T-ENT-05 Repository là ExternalCall spring-data, EntityManager là jakarta.persistence, OrderService là cạnh thường", () => {
      const repoSource = `
package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OwnerRepository extends JpaRepository<Owner, Integer> {
    Owner findByLastName(String lastName);
}
`;
      const serviceSource = `
package com.example.demo;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    public Order findById(int id) {
        return new Order();
    }
}
`;
      const clientSource = `
package com.example.demo;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

@Service
public class ClientService {
    private final OwnerRepository owners;
    private final EntityManager entityManager;
    private final OrderService orderService;

    public ClientService(OwnerRepository owners, EntityManager entityManager, OrderService orderService) {
        this.owners = owners;
        this.entityManager = entityManager;
        this.orderService = orderService;
    }

    public void process() {
        owners.findById(1);
        owners.findByLastName("x");
        entityManager.persist(new Object());
        orderService.findById(1);
    }
}
`;
      const repoFile = parseJavaFile("src/main/java/com/example/demo/OwnerRepository.java", repoSource);
      const serviceFile = parseJavaFile("src/main/java/com/example/demo/OrderService.java", serviceSource);
      const clientFile = parseJavaFile("src/main/java/com/example/demo/ClientService.java", clientSource);
      const files = [repoFile, serviceFile, clientFile];

      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);

      // 1. owners.findById(1) và owners.findByLastName("x") là ExternalCall spring-data
      const springDataCalls = result.external.filter((e) => e.import_source === "spring-data");
      expect(springDataCalls).toHaveLength(2);
      expect(springDataCalls.map((e) => e.method).sort()).toEqual(["findById", "findByLastName"]);
      expect(springDataCalls[0]?.receiver_chain).toEqual(["owners"]);

      // 2. entityManager.persist(o) là ExternalCall jakarta.persistence
      const jpaCalls = result.external.filter((e) => e.import_source === "jakarta.persistence");
      expect(jpaCalls).toHaveLength(1);
      expect(jpaCalls[0]?.method).toBe("persist");
      expect(jpaCalls[0]?.receiver_chain).toEqual(["entityManager"]);

      // 3. orderService.findById(1) là cạnh RESOLVED tới OrderService.findById, không phải ExternalCall
      const resolvedEdge = result.edges.find((e) => e.callee.includes("OrderService.findById"));
      expect(resolvedEdge).toBeDefined();
      expect(resolvedEdge?.confidence).toBe("RESOLVED");
      expect(resolvedEdge?.ambiguous).toBe(false);

      const orderServiceExtCalls = result.external.filter((e) => e.receiver_chain.includes("orderService"));
      expect(orderServiceExtCalls).toHaveLength(0);
    });

    it("ENT-41: orders.save(o) với OrderRepository là class @Repository có thân => có cạnh tới OrderRepository.save, không có ExternalCall spring-data cho lời gọi đó", () => {
      const repoSource = `
package com.example.demo;

import org.springframework.stereotype.Repository;

@Repository
public class OrderRepository {
    public Order save(Order o) {
        return o;
    }
}
`;
      const entitySource = `
package com.example.demo;

public class Order {}
`;
      const serviceSource = `
package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final OrderRepository orders;

    public OrderService(OrderRepository orders) {
        this.orders = orders;
    }

    public Order create(Order o) {
        return this.orders.save(o);
    }
}
`;
      const repoFile = parseJavaFile("src/main/java/com/example/demo/OrderRepository.java", repoSource);
      const entityFile = parseJavaFile("src/main/java/com/example/demo/Order.java", entitySource);
      const serviceFile = parseJavaFile("src/main/java/com/example/demo/OrderService.java", serviceSource);
      const files = [repoFile, entityFile, serviceFile];

      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);

      // Có cạnh tới OrderRepository.save với confidence RESOLVED
      const saveEdge = result.edges.find(
        (e) => e.caller.includes("OrderService.create") && e.callee.includes("OrderRepository.save")
      );
      expect(saveEdge).toBeDefined();
      expect(saveEdge?.confidence).toBe("RESOLVED");
      expect(saveEdge?.ambiguous).toBe(false);

      // Không có ExternalCall spring-data cho lời gọi đó
      const springDataCalls = result.external.filter((e) => e.import_source === "spring-data");
      expect(springDataCalls).toHaveLength(0);
    });
  });

  describe("T-ENT-06: 3 tầng Controller -> Service -> Repository & Tiêm Interface", () => {
    it("T-ENT-06 có cạnh controller -> service, ExternalCall ở service, 1 impl => RESOLVED, 2 impl => INFERRED ambiguous", () => {
      const iface1Source = `
package com.example.demo;

public interface SingleService {
    void execute();
}
`;
      const impl1Source = `
package com.example.demo;

public class SingleServiceImpl implements SingleService {
    @Override
    public void execute() {
        System.out.println("single");
    }
}
`;
      const iface2Source = `
package com.example.demo;

public interface MultiService {
    void dispatch();
}
`;
      const impl2ASource = `
package com.example.demo;

public class MultiServiceA implements MultiService {
    @Override
    public void dispatch() {
        System.out.println("A");
    }
}
`;
      const impl2BSource = `
package com.example.demo;

public class MultiServiceB implements MultiService {
    @Override
    public void dispatch() {
        System.out.println("B");
    }
}
`;
      const repoSource = `
package com.example.demo;

import org.springframework.data.repository.CrudRepository;

public interface AccountRepo extends CrudRepository<Account, Long> {
}
`;
      const serviceSource = `
package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class AccountService {
    private final AccountRepo repo;

    public AccountService(AccountRepo repo) {
        this.repo = repo;
    }

    public void runBusiness() {
        repo.deleteById(10L);
    }
}
`;
      const ctrlSource = `
package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AccountController {
    private final AccountService service;
    private final SingleService single;
    private final MultiService multi;

    public AccountController(AccountService service, SingleService single, MultiService multi) {
        this.service = service;
        this.single = single;
        this.multi = multi;
    }

    @GetMapping("/run")
    public void handleRun() {
        service.runBusiness();
        single.execute();
        multi.dispatch();
    }
}
`;
      const testSource = `
package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;

public class XTest {
    @GetMapping("/test-endpoint")
    public void shouldNotBeBound() {}
}
`;

      const files = [
        parseJavaFile("src/main/java/com/example/demo/SingleService.java", iface1Source),
        parseJavaFile("src/main/java/com/example/demo/SingleServiceImpl.java", impl1Source),
        parseJavaFile("src/main/java/com/example/demo/MultiService.java", iface2Source),
        parseJavaFile("src/main/java/com/example/demo/MultiServiceA.java", impl2ASource),
        parseJavaFile("src/main/java/com/example/demo/MultiServiceB.java", impl2BSource),
        parseJavaFile("src/main/java/com/example/demo/AccountRepo.java", repoSource),
        parseJavaFile("src/main/java/com/example/demo/AccountService.java", serviceSource),
        parseJavaFile("src/main/java/com/example/demo/AccountController.java", ctrlSource),
        parseJavaFile("src/test/java/com/example/demo/XTest.java", testSource),
      ];

      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);

      // Cạnh Controller -> Service
      const ctrlToService = result.edges.find((e) =>
        e.caller.includes("AccountController.handleRun") && e.callee.includes("AccountService.runBusiness")
      );
      expect(ctrlToService).toBeDefined();
      expect(ctrlToService?.confidence).toBe("RESOLVED");

      // Service gọi Repository -> ExternalCall spring-data
      const repoCall = result.external.find((e) =>
        e.caller.includes("AccountService.runBusiness") && e.method === "deleteById"
      );
      expect(repoCall).toBeDefined();
      expect(repoCall?.import_source).toBe("spring-data");

      // SingleService có 1 lớp cài đặt -> RESOLVED
      const singleCall = result.edges.find((e) =>
        e.caller.includes("AccountController.handleRun") && e.callee.includes("SingleServiceImpl.execute")
      );
      expect(singleCall).toBeDefined();
      expect(singleCall?.confidence).toBe("RESOLVED");
      expect(singleCall?.ambiguous).toBe(false);

      // MultiService có 2 lớp cài đặt -> INFERRED, ambiguous: true tới từng lớp
      const multiCalls = result.edges.filter((e) =>
        e.caller.includes("AccountController.handleRun") &&
        (e.callee.includes("MultiServiceA.dispatch") || e.callee.includes("MultiServiceB.dispatch"))
      );
      expect(multiCalls).toHaveLength(2);
      expect(multiCalls.every((e) => e.confidence === "INFERRED" && e.ambiguous === true)).toBe(true);

      // File test src/test/java/XTest.java có @GetMapping nhưng không tạo binding (ENT-44)
      const testBindings = result.bindings.filter((b) => b.file_path.includes("XTest.java"));
      expect(testBindings).toHaveLength(0);

      // Móc nối callgraph.ts: buildCallGraph trả về đủ binding, cạnh và external call
      const fullGraph = buildCallGraph(files, idx);
      expect(fullGraph.bindings.some((b) => b.display_name === '@GetMapping("/run")')).toBe(true);
      expect(fullGraph.edges.some((e) => e.callee.includes("AccountService.runBusiness"))).toBe(true);
      expect(fullGraph.external.some((e) => e.import_source === "spring-data")).toBe(true);

      // Móc nối slicing.ts: buildSlice đi qua Controller -> Service có DATA_SINK ở service
      const runBinding = fullGraph.bindings.find((b) => b.display_name === '@GetMapping("/run")');
      expect(runBinding).toBeDefined();

      const filesMap = new Map<string, ParsedFile>();
      for (const f of files) filesMap.set(f.path, f);

      const ctx: EngineContext = {
        files: filesMap,
        idx,
        edges: fullGraph.edges,
        external: fullGraph.external,
        tech_stack: ["Spring Boot"],
        rank: new Map(),
        source_map: new Map(),
      };

      const candidate = buildSlice(
        { key: runBinding!.handler, binding: runBinding!, source: "REGISTERED" },
        ctx
      );
      expect(candidate.trace_steps.length).toBeGreaterThanOrEqual(2);
      expect(candidate.trace_steps[0]?.layer).toBe("ENTRY_POINT");
      const serviceStep = candidate.trace_steps.find((st) =>
        st.function_name.includes("AccountService.runBusiness")
      );
      expect(serviceStep).toBeDefined();
    });
  });

  describe("ENT-40: isSpringDataAccessFile", () => {
    it("ENT-40 đúng với @Repository và interface kế thừa ENT-40, sai với @Service và @Controller", () => {
      const repoFile = parseJavaFile(
        "src/main/java/com/example/demo/MyRepo.java",
        `
package com.example.demo;
import org.springframework.stereotype.Repository;

@Repository
public class MyRepo {}
`
      );

      const jpaRepoFile = parseJavaFile(
        "src/main/java/com/example/demo/ItemRepo.java",
        `
package com.example.demo;
import org.springframework.data.repository.Repository;

public interface ItemRepo extends Repository<Item, Long> {}
`
      );

      const serviceFile = parseJavaFile(
        "src/main/java/com/example/demo/MyService.java",
        `
package com.example.demo;
import org.springframework.stereotype.Service;

@Service
public class MyService {}
`
      );

      const controllerFile = parseJavaFile(
        "src/main/java/com/example/demo/MyController.java",
        `
package com.example.demo;
import org.springframework.stereotype.Controller;

@Controller
public class MyController {}
`
      );

      expect(isSpringDataAccessFile(repoFile)).toBe(true);
      expect(isSpringDataAccessFile(jpaRepoFile)).toBe(true);
      expect(isSpringDataAccessFile(serviceFile)).toBe(false);
      expect(isSpringDataAccessFile(controllerFile)).toBe(false);

      // Kiểm tra cache qua WeakMap
      expect(isSpringDataAccessFile(repoFile)).toBe(true);
    });
  });

  describe("ENT-4x: Overload, this.helper(), lời gọi lồng a.b().c(), constructor", () => {
    it("ENT-4x chọn đúng overload theo số tham số và ambiguous khi không khớp", () => {
      const source = `
package com.example.demo;

public class OverloadHelper {
    public void compute(int x) {}
    public void compute(int x, String y) {}

    public void test() {
        compute(1);
        this.compute(1, "str");
        compute(1, "str", true);
    }
}
`;
      const file = parseJavaFile("src/main/java/com/example/demo/OverloadHelper.java", source);
      const files = [file];
      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);
      const testEdges = result.edges.filter((e) => e.caller.includes("OverloadHelper.test"));
      expect(testEdges.length).toBeGreaterThanOrEqual(2);

      // Có cạnh tới compute 1 tham số
      const call1 = testEdges.find((e) => e.callee.endsWith("#OverloadHelper.compute"));
      expect(call1).toBeDefined();

      // Có cạnh tới compute 2 tham số
      const call2 = testEdges.find((e) => e.callee.endsWith("#OverloadHelper.compute~2"));
      expect(call2).toBeDefined();
    });

    it("ENT-4x xử lý lời gọi lồng a.b().c() và object_creation_expression", () => {
      const source = `
package com.example.demo;

public class ChainTest {
    public static class Worker {
        public Worker() {}
        public Builder getBuilder() {
            return new Builder();
        }
    }

    public static class Builder {
        public void execute() {}
    }

    private final Worker worker;

    public ChainTest(Worker worker) {
        this.worker = worker;
    }

    public void run() {
        Worker w = new Worker();
        worker.getBuilder().execute();
    }
}
`;
      const file = parseJavaFile("src/main/java/com/example/demo/ChainTest.java", source);
      const files = [file];
      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);

      // w = new Worker() tạo cạnh RESOLVED tới constructor
      const ctorEdge = result.edges.find((e) => e.callee.includes("Worker.Worker"));
      expect(ctorEdge).toBeDefined();
      expect(ctorEdge?.confidence).toBe("RESOLVED");

      // worker.getBuilder() tạo cạnh RESOLVED tới Worker.getBuilder
      const getBuilderEdge = result.edges.find((e) => e.callee.includes("Worker.getBuilder"));
      expect(getBuilderEdge).toBeDefined();
      expect(getBuilderEdge?.confidence).toBe("RESOLVED");

      // .execute() trên a.b() được duyệt qua và sinh ExternalCall import_source: null
      const execCall = result.external.find((e) => e.method === "execute");
      expect(execCall).toBeDefined();
      expect(execCall?.import_source).toBeNull();
    });
  });

  describe("TASK_25: Cognitive Complexity Java & Node thuật toán (ENG-71, ENG-90)", () => {
    it("ENG-71 constructor gán 2 field của lớp có method khác phức tạp => cognitiveComplexity trả 0", () => {
      const source = `
package com.example.demo;

public class PetController {
    private final String repo;
    private final int timeout;

    public PetController(String repo, int timeout) {
        this.repo = repo;
        this.timeout = timeout;
    }

    public void complexMethod(int x) {
        if (x > 0) {
            for (int i = 0; i < x; i++) {
                if (i % 2 == 0) {
                    System.out.println(i);
                }
            }
        }
    }
}
`;
      const file = parseJavaFile("src/main/java/com/example/demo/PetController.java", source);
      const files = [file];
      const idx = collectSymbols(files);

      const ctorFunc = Array.from(idx.functions.values()).find(
        (fn) => fn.name === "PetController.PetController"
      );
      expect(ctorFunc).toBeDefined();

      const ctorComplexity = cognitiveComplexity(ctorFunc!, file);
      expect(ctorComplexity).toBe(0);
    });

    it("ENG-71 method 2 if lồng + 1 for => điểm > 0 và chỉ tính trong method đó", () => {
      const source = `
package com.example.demo;

import java.util.List;

public class LogicService {
    public void otherVeryComplexMethod(int a) {
        if (a > 0) {
            if (a > 10) {
                if (a > 20) {
                    System.out.println(a);
                }
            }
        }
    }

    public void targetMethod(int x, List<String> items) {
        if (x > 0) {
            if (x < 100) {
                for (String item : items) {
                    System.out.println(item);
                }
            }
        }
    }
}
`;
      const file = parseJavaFile("src/main/java/com/example/demo/LogicService.java", source);
      const files = [file];
      const idx = collectSymbols(files);

      const targetFunc = Array.from(idx.functions.values()).find(
        (fn) => fn.name === "LogicService.targetMethod"
      );
      expect(targetFunc).toBeDefined();

      const score = cognitiveComplexity(targetFunc!, file);
      expect(score).toBeGreaterThan(0);
      expect(score).toBe(6);

      const otherFunc = Array.from(idx.functions.values()).find(
        (fn) => fn.name === "LogicService.otherVeryComplexMethod"
      );
      expect(otherFunc).toBeDefined();
      const otherScore = cognitiveComplexity(otherFunc!, file);
      expect(otherScore).toBe(6);
    });

    it("ENG-90 method Java có complexity > CONFIG.VIP_COMPLEXITY_MIN qua buildAlgoCandidates ra node có bước đúng tên method, không rỗng", () => {
      const source = `
package com.example.demo;

import java.util.List;

public class AlgoService {
    public int compute(List<Integer> list, int threshold) {
        int sum = 0;
        if (threshold > 0) {
            if (threshold > 5) {
                if (threshold > 10) {
                    for (int x : list) {
                        if (x > 0) {
                            if (x % 2 == 0) {
                                sum += x;
                            } else {
                                sum -= x;
                            }
                        }
                    }
                }
            }
        }
        return sum;
    }
}
`;
      const file = parseJavaFile("src/main/java/com/example/demo/AlgoService.java", source);
      const files = [file];
      const idx = collectSymbols(files);

      const fn = Array.from(idx.functions.values()).find(
        (f) => f.name === "AlgoService.compute"
      );
      expect(fn).toBeDefined();

      const comp = cognitiveComplexity(fn!, file);
      expect(comp).toBeGreaterThan(CONFIG.VIP_COMPLEXITY_MIN);
      fn!.complexity = comp;

      const filesMap = new Map<string, ParsedFile>();
      filesMap.set(file.path, file);

      const ctx: EngineContext = {
        files: filesMap,
        idx,
        edges: [],
        external: [],
        tech_stack: ["Spring Boot"],
        rank: new Map([[file.path, 1.0]]),
        source_map: new Map(),
      };

      const candidates = buildAlgoCandidates([fn!], ctx);
      expect(candidates).toHaveLength(1);

      const c = candidates[0]!;
      expect(c.node_type).toBe("ALGORITHMIC_CORE");
      expect(c.entry_symbol).toBe(fn!.key);
      expect(c.trace_steps.length).toBeGreaterThan(0);

      for (const st of c.trace_steps) {
        expect(st.function_name).toBe(fn!.name);
        expect(st.snippet.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("ENT-44: File test không tạo binding route", () => {
    it("ENT-44: src/test/java/com/example/XTest.java có @GetMapping ⇒ không có binding; src/main/java/com/example/demo/HomeController.java có @GetMapping ⇒ có binding", () => {
      const testSource = `
package com.example;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class XTest {
    @GetMapping("/test")
    public String test() {
        return "test";
    }
}
`;
      const homeSource = `
package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {
    @GetMapping("/home")
    public String home() {
        return "home";
    }
}
`;
      const testFile = parseJavaFile("src/test/java/com/example/XTest.java", testSource);
      const homeFile = parseJavaFile("src/main/java/com/example/demo/HomeController.java", homeSource);
      const files = [testFile, homeFile];
      const idx = collectSymbols(files);
      resolveImports(files, idx, new Map(), {
        go_module_path: null,
        dart_package_name: null,
        package_entry_files: [],
      });

      const result = buildJavaCallGraph(files, idx);

      const testBinding = result.bindings.find((b) => b.file_path.includes("XTest.java"));
      expect(testBinding).toBeUndefined();

      const homeBinding = result.bindings.find((b) => b.file_path.includes("HomeController.java"));
      expect(homeBinding).toBeDefined();
      expect(homeBinding?.path).toBe("/home");
      expect(homeBinding?.method).toBe("GET");
      expect(homeBinding?.display_name).toBe('@GetMapping("/home")');

      // Kiểm tra trực tiếp hàm nội bộ isJavaTestSource với cả POSIX và Windows path
      expect(isJavaTestSource("src/test/java/com/example/XTest.java")).toBe(true);
      expect(isJavaTestSource("src\\test\\java\\com\\example\\XTest.java")).toBe(true);
      expect(isJavaTestSource("src/main/java/com/example/demo/HomeController.java")).toBe(false);
      expect(isJavaTestSource("src\\main\\java\\com\\example\\demo\\HomeController.java")).toBe(false);
    });
  });
});
