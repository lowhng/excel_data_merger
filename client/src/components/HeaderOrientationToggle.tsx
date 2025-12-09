import { HeaderOrientation } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface HeaderOrientationToggleProps {
  orientation: HeaderOrientation;
  onChange: (orientation: HeaderOrientation) => void;
  disabled?: boolean;
}

export default function HeaderOrientationToggle({
  orientation,
  onChange,
  disabled = false,
}: HeaderOrientationToggleProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Header Orientation</Label>
      <RadioGroup
        value={orientation}
        onValueChange={(value) => onChange(value as HeaderOrientation)}
        disabled={disabled}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="horizontal" id="horizontal" />
          <Label
            htmlFor="horizontal"
            className="text-sm font-normal cursor-pointer"
          >
            Horizontal (First Row)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="vertical" id="vertical" />
          <Label
            htmlFor="vertical"
            className="text-sm font-normal cursor-pointer"
          >
            Vertical (First Column)
          </Label>
        </div>
      </RadioGroup>
      <p className="text-xs text-muted-foreground">
        Select whether headers are in the first row (horizontal) or first column (vertical)
      </p>
    </div>
  );
}

