;; JavaScript captures — spec 11 Mục 1 ý 4
(function_declaration
  name: (identifier) @name) @def.function

(generator_function_declaration
  name: (identifier) @name) @def.function

(method_definition
  name: [(property_identifier) (identifier)] @name) @def.method

(class_declaration
  name: (identifier) @name) @def.class

(variable_declarator
  name: (identifier) @name
  value: [(arrow_function) (function_expression)]) @def.function

(variable_declarator
  name: (identifier) @name) @def.var

(call_expression
  function: [(identifier) (member_expression)] @name) @call

(new_expression
  constructor: [(identifier) (member_expression)] @name) @call

(import_statement) @import
