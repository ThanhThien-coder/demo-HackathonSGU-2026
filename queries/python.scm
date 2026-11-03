;; Python captures — spec 11 Mục 1 ý 4
(class_definition
  body: (block
    (function_definition
      name: (identifier) @name) @def.method))

(function_definition
  name: (identifier) @name) @def.function

(class_definition
  name: (identifier) @name) @def.class

(assignment
  left: (identifier) @name) @def.var

(call
  function: [(identifier) (attribute)] @name) @call

(import_statement) @import
(import_from_statement) @import
