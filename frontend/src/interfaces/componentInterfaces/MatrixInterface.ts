import { IComponent } from "@/interfaces/TaskGraphInterface";
import { Matrix } from "@/helpers/LinearAlgebra";

interface IMatrixInstruction {
  operations: Array<string>;
  paths: Array<string>;
}

interface IMatrixComponent extends IComponent {
  methods: {
    fillZeros: string;
    showSolution: string;
    copyToClipboard: string;
  };
  component: {
    initialize: IMatrixInstruction;
    validationData: null | Matrix;
    userData: null | Matrix;
    readOnly: boolean;
    rowLabel: string;
    columnLabel: string;
  };
  dependencies: {
    Matrix: { data: string };
  };
}

export { IMatrixComponent, IMatrixInstruction };
