import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IFormField {
  type: string;
  initial: any;
  presets: any;
  placeholder: string;
}

interface IPresets {
  easy: any;
  medium: any;
  hard: any;
}

interface IRange {
  lowerValue: number;
  upperValue: number;
}

interface IRangePresets extends IPresets {
  easy: IRange;
  medium: IRange;
  hard: IRange;
}

interface IRangeFormfield extends IFormField {
  initial: IRange;
  min: number;
  max: number;
  presets: IRangePresets;
}

interface INumberPresets extends IPresets {
  easy: number;
  medium: number;
  hard: number;
}

interface INumberFormField extends IFormField {
  initial: number;
  presets: INumberPresets;
}

interface IParameters {
  parameters: { [key: string]: IRangeFormfield | INumberFormField | IFormField };
}

interface ITaskConfigurationComponent extends IComponent {
  component: {
    state: IParameters;
    actions: [
      {
        type: "fetchData";
        instruction: string;
        label: string;
      }
    ];
  };
}

export { ITaskConfigurationComponent };
