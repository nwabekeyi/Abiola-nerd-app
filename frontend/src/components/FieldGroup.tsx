type Field = readonly [name: string, label: string];

const titleOptions = ['Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Miss', 'Ms.', 'Honourable'] as const;

const selectOptions: Record<string, readonly string[]> = {
  title: titleOptions,
  sex: ['Male', 'Female'],
  maritalStatus: ['Married', 'Single', 'Divorced']
};

type Props = {
  title?: string;
  fields: readonly Field[];
  prefix?: string;
  onChange?: () => void;
};

export function FieldGroup({ title, fields, prefix, onChange }: Props) {
  return (
    <>
      {title && <h2>{title}</h2>}
      {fields.map(([name, label]) => {
        const fieldName = prefix ? `${prefix}_${name}` : name;
        const options = selectOptions[name];
        const required = name !== 'middleName';

        return (
          <label key={`${prefix ?? 'root'}-${name}`} style={{ marginBottom: '0.75rem' }}>
            {label}
            {options ? (
              <select id={!prefix ? name : undefined} name={fieldName} required={required} defaultValue="" onChange={onChange}>
                <option value="" disabled>Select {label.toLowerCase()}</option>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input
                id={!prefix ? name : undefined}
                name={fieldName}
                type={name === 'dateOfBirth' ? 'date' : name.toLowerCase().includes('email') ? 'email' : 'text'}
                placeholder={label}
                required={required}
                onChange={onChange}
                minLength={name === 'ninNumber' ? 11 : undefined}
                maxLength={name === 'ninNumber' ? 11 : undefined}
                pattern={name === 'ninNumber' ? String.raw`\d{11}` : undefined}
                title={name === 'ninNumber' ? 'NIN must be exactly 11 digits' : undefined}
              />
            )}
          </label>
        );
      })}
    </>
  );
}
