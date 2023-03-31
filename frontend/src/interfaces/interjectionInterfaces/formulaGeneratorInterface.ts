import { IInterjection, taskGraphPath } from "@/interfaces/TaskGraphInterface";

export interface IFormulaGenerator extends IInterjection {
  dependencies: { variables: taskGraphPath; formula: taskGraphPath; texFormula: taskGraphPath; decimals?: number };
}
