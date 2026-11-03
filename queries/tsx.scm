;; TSX captures — spec 11 Mục 1 ý 4
(function_declaration
  name: (identifier) @name) @def.function

(function_signature
  name: (identifier) @name) @def.function

(method_definition
  name: [(property_identifier) (identifier)] @name) @def.method

(method_signature
  name: [(property_identifier) (identifier)] @name) @def.method

(class_declaration
  name: (type_identifier) @name) @def.class

(abstract_class_declaration
  name: (type_identifier) @name) @def.class

(interface_declaration
  name: (type_identifier) @name) @def.interface

(type_alias_declaration
  name: (type_identifier) @name) @def.type

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
