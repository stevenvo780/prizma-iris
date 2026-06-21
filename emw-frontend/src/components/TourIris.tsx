import React, { useEffect, useCallback } from 'react';
import { PrizmaTour, usePrizmaTour, TourStep } from 'prizma-ui';
import { useTourContext } from './TourContext';

const TOUR_KEY = 'iris-frontend-v1';

const steps: TourStep[] = [
  {
    target: '[data-tour="nav-whatsapp-sessions"]',
    title: 'Conecta tu cuenta de WhatsApp',
    body: 'Antes de enviar mensajes, configura aquí tu cuenta de WhatsApp Business (número, Phone Number ID y token de acceso).',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-templates"]',
    title: 'Crea templates de opt-in',
    body: 'Los templates son los mensajes de texto que Iris envía para solicitar autorización al contacto. Crea y activa uno antes de programar tu primera campaña.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="create-message-btn"]',
    title: 'Diseña tus mensajes de campaña',
    body: 'Crea mensajes con texto, imágenes o archivos que se enviarán a los contactos que ya aceptaron recibir comunicaciones.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-customers"]',
    title: 'Importa tus clientes',
    body: 'Sube tu lista de contactos (CSV/Excel) y asígnales etiquetas. Las etiquetas determinan a quién se envía cada campaña.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="scheduler"]',
    title: 'Programa y envía la campaña',
    body: 'Selecciona una o más etiquetas en este selector y pulsa "Enviar" para despachar los mensajes activos a todos los contactos de esas etiquetas.',
    placement: 'bottom',
  },
];

const TourIris: React.FC = () => {
  const { registerStart } = useTourContext();
  const tour = usePrizmaTour({ runKey: TOUR_KEY, total: steps.length });

  const handleStart = useCallback(() => tour.start(0), [tour.start]);

  // Register the start function so the Header's ? button can trigger it
  useEffect(() => {
    registerStart(handleStart);
  }, [registerStart, handleStart]);

  return (
    <PrizmaTour
      steps={steps}
      runKey={TOUR_KEY}
      autoStart
      {...tour.tourProps}
      onFinish={() => tour.finish()}
      onSkip={() => tour.finish()}
    />
  );
};

export default TourIris;
