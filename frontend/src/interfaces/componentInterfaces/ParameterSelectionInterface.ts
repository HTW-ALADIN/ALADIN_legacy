import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IAction {
  type: string;
  label: string;
  instruction: string;
}

// conforms to all the filenames in the @/components/taskComponents/form folder
type FormType = "CheckboxFormField" | "DropdownFormField" | "RangeFormField" | "ValueFormField";
type InputType = "string" | "number" | "date";

interface IParameter {
  formType: FormType;
  type: InputType;
  presets: {
    easy: number | string;
    medium: number | string;
    hard: number | string;
  };
  title: string;
}

interface IRangeParameter extends IParameter {
  formType: "RangeFormField";
  initial: { lowerValue: number; upperValue: number };
  boundaries: { min: number; max: number };
}

interface IDropdownParameter extends IParameter {
  formType: "DropdownFormField";
  initial: string;
  options: Array<string>;
}

interface ICheckboxParameter extends IParameter {
  formType: "CheckboxFormField";
  checked: boolean;
}

interface IValueParameter extends IParameter {
  formType: "ValueFormField";
  initial: string | number;
}

interface IParameters {
  [parameterName: string]: IRangeParameter | IDropdownParameter | ICheckboxParameter | IValueParameter;
}

interface IParameterSelection extends IComponent {
  dependencies: {
    DOTGraph: { dotDescription: string };
  };
  component: {
    title: string;
    actions: Array<IAction>;
    form: IParameters;
  };
}

export { IParameterSelection };
