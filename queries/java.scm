;; Java captures — spec 11 Mục 1 ý 4
(class_declaration
  name: (identifier) @name) @def.class

(interface_declaration
  name: (identifier) @name) @def.class

(enum_declaration
  name: (identifier) @name) @def.class

(record_declaration
  name: (identifier) @name) @def.class

(method_declaration
  name: (identifier) @name) @def.method

(constructor_declaration
  name: (identifier) @name) @def.method

(method_invocation
  name: (identifier) @name) @call

(object_creation_expression
  type: (_) @name) @call

(import_declaration) @import
