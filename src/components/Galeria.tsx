export function Galeria() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Galería</h2>
          <p className="section-head__subtitle">Momentos de los partidos.</p>
        </div>
      </div>
      <div className="gallery-empty">
        <span className="gallery-empty__icon" aria-hidden>
          📸
        </span>
        <div className="gallery-empty__title">Próximamente</div>
        <div className="gallery-empty__sub">
          Vamos a subir acá las mejores fotos y videos de cada martes.
        </div>
      </div>
    </div>
  );
}
