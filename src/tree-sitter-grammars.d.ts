declare module "tree-sitter-typescript" {
  import type { Language } from "tree-sitter";

  export const typescript: Language;
  export const tsx: Language;
}

declare module "tree-sitter-java" {
  import type { Language } from "tree-sitter";

  const Java: Language;
  export default Java;
}

declare module "tree-sitter-python" {
  import type { Language } from "tree-sitter";

  const Python: Language;
  export default Python;
}