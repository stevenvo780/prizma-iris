import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';

interface Variable {
  key: string;
  label: string;
  description?: string;
}

interface VariableButtonsProps {
  onVariableInsert: (variable: string) => void;
  size?: 'sm' | 'lg';
  variant?: string;
}

const AVAILABLE_VARIABLES: Variable[] = [
  { key: '{{firstName}}', label: 'Nombre', description: 'Nombre del cliente' },
  { key: '{{lastName}}', label: 'Apellido', description: 'Apellido del cliente' },
  { key: '{{companyName}}', label: 'Empresa', description: 'Nombre de la empresa' },
  { key: '{{title}}', label: 'Título', description: 'Título o posición' },
  { key: '{{lastContact}}', label: 'Último Contacto', description: 'Fecha del último contacto' },
  { key: '{{campaign}}', label: 'Campaña', description: 'Campaña actual' },
  { key: '{{note}}', label: 'Nota', description: 'Nota del cliente' },
  { key: '{{label}}', label: 'Etiqueta', description: 'Etiquetas del cliente' },
  { key: '{{data1}}', label: 'Dato 1', description: 'Campo personalizado 1' },
  { key: '{{data2}}', label: 'Dato 2', description: 'Campo personalizado 2' },
  { key: '{{data3}}', label: 'Dato 3', description: 'Campo personalizado 3' },
];

const VariableButtons: React.FC<VariableButtonsProps> = ({
  onVariableInsert,
  size = 'sm',
  variant = 'outline-secondary',
}) => {
  return (
    <div>
      <div className='mb-2'>
        <strong className='text-muted' style={{ fontSize: '0.9rem' }}>
          Variables de cliente disponibles:
        </strong>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {AVAILABLE_VARIABLES.map(variable => (
          <Button
            key={variable.key}
            variant={variant}
            size={size}
            onClick={() => onVariableInsert(variable.key)}
            title={variable.description}
            style={{
              fontSize: '0.75rem',
              padding: '2px 6px',
              margin: '1px',
            }}
          >
            <FaPlus size={10} className='me-1' />
            {variable.label}
          </Button>
        ))}
      </div>
      <div className='mt-1'>
        <small className='text-muted'>
          Haz clic en cualquier botón para insertar la variable en el texto
        </small>
      </div>
    </div>
  );
};

export default VariableButtons;
