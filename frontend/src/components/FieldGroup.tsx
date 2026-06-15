type Field = readonly [name: string, label: string];

type Props = {
  title: string;
  fields: readonly Field[];
  prefix?: string;
};

export function FieldGroup({ title, fields, prefix }: Props) {
  return (
    <>
      <h2>{title}</h2>
      {fields.map(([name, label]) => (
        <label key={`${prefix ?? 'root'}-${name}`}>
          {label}
          <input
            id={!prefix ? name : undefined}
            name={prefix ? `${prefix}_${name}` : name}
            type={name === 'dateOfBirth' ? 'date' : 'text'}
            placeholder={label}
          />
        </label>
      ))}
    </>
  );
}
