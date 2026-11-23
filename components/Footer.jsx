export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-page space-y-2 px-5 py-8 text-sm text-ink-soft">
        <p className="max-w-prose">
          Saans turns live air-quality data into everyday guidance. Readings come from Open-Meteo
          and are modelled estimates, not ground-monitor measurements. Explanations are written by
          Gemini and checked by code before you see them.
        </p>
        <p className="max-w-prose">
          This is general guidance, not medical advice. If anyone has breathlessness, chest pain or
          other symptoms, please speak to a doctor. Your household answers stay in this browser.
        </p>
      </div>
    </footer>
  );
}
