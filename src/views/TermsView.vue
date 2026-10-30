<template>
  <main class="terms-page">
    <div class="terms-wrap">
      <header class="terms-topbar">
        <RouterLink
          class="terms-brand"
          to="/"
        >
          <img
            src="/assets/tale-star-mark.png"
            alt=""
          >
          <span>Tale Star</span>
        </RouterLink>
        <RouterLink
          class="terms-back"
          to="/register"
        >
          Volver al registro
        </RouterLink>
      </header>

      <article class="terms-card">
        <div class="terms-intro">
          <span class="eyebrow">Información de uso</span>
          <h1>Términos y condiciones</h1>
          <p>
            Estas condiciones explican cómo usar Tale Star y qué debes tener en cuenta al crear
            contenido para niños. Léelas antes de crear tu cuenta.
          </p>
          <span class="terms-date">Versión 1.1 · Última actualización: 30 de octubre de 2026</span>
        </div>

        <nav
          class="terms-index"
          aria-label="Contenido de los términos"
        >
          <a href="#servicio">El servicio</a>
          <a href="#cuenta">Tu cuenta</a>
          <a href="#contenido">Tu contenido</a>
          <a href="#generacion">Generación y revisión</a>
          <a href="#menores">Uso con niños</a>
          <a href="#biblioteca">Biblioteca</a>
          <a href="#disponibilidad">Disponibilidad y cambios</a>
        </nav>

        <div class="terms-content">
          <section id="servicio">
            <h2>1. El servicio</h2>
            <p>
              Tale Star es una herramienta para que padres, cuidadores y docentes creen y organicen
              recursos educativos para niños. En la aplicación web puedes redactar cuentos y sus
              páginas, configurar personajes, escenarios y estilos, solicitar imágenes y música, y
              conservar referencias a tus creaciones en una biblioteca.
            </p>
            <p>
              La lectura móvil con realidad aumentada forma parte de los planes del proyecto y no
              está incluida en las funciones actuales de esta aplicación web.
            </p>
          </section>

          <section id="cuenta">
            <h2>2. Tu cuenta</h2>
            <p>
              Las cuentas y las herramientas de creación están dirigidas a personas adultas. Al
              registrarte, proporciona información correcta y protege tu contraseña. Eres responsable
              de las acciones realizadas desde tu cuenta.
            </p>
            <p>
              Puedes configurar un PIN parental para controlar la salida del modo infantil. Este
              control de interfaz no sustituye la supervisión de un adulto.
            </p>
          </section>

          <section id="contenido">
            <h2>3. Tu contenido</h2>
            <p>
              Introduce solo textos, descripciones y otros materiales que tengas derecho a usar.
              Evita incorporar datos personales de niños u otras personas cuando no sean necesarios
              para crear el recurso. No utilices Tale Star para crear contenido ilegal o que vulnere
              derechos de terceros.
            </p>
          </section>

          <section id="generacion">
            <h2>4. Generación y revisión</h2>
            <p>
              Las imágenes y la música se generan a partir de las indicaciones que proporcionas. El
              proceso puede tardar, fallar o producir resultados distintos de los esperados. La
              generación no garantiza que un resultado sea correcto o adecuado para una edad,
              actividad o propósito educativo concreto.
            </p>
            <p>
              Antes de mostrar, reproducir, publicar o compartir un recurso con menores, el adulto
              debe leer todo el texto, inspeccionar todas las imágenes y escuchar el audio completo,
              incluidas sus letras. Debe evaluar la adecuación a la edad, al contexto y a las
              necesidades del menor, descartar resultados inapropiados y repetir esta revisión
              después de cada regeneración. Los controles automáticos no garantizan contenido seguro;
              la generación no implica aprobación del resultado por Tale Star.
            </p>
          </section>

          <section id="menores">
            <h2>5. Uso con niños</h2>
            <p>
              Los niños son los destinatarios del contenido, mientras que la selección, creación y
              revisión corresponden al adulto. Si permites que un niño consulte una creación, debes
              acompañar su uso y comprobar previamente que el material sea apropiado para él.
            </p>
            <p>
              El adulto asume la responsabilidad que legalmente le corresponda por las instrucciones
              y materiales que aporta, por incumplir su deber de revisión y por sus decisiones de
              mostrar o compartir contenido. Debe respetar derechos de terceros y las autorizaciones
              necesarias. Está prohibido solicitar o distribuir contenido sexual, explotación de
              menores, violencia gráfica, maltrato, odio o contenido ilícito.
            </p>
            <p>
              Estas condiciones no excluyen responsabilidades legales imperativas del proveedor
              ni limitan derechos irrenunciables de consumidores o menores. No constituyen una
              exoneración absoluta de Tale Star.
            </p>
          </section>

          <section id="biblioteca">
            <h2>6. Biblioteca</h2>
            <p>
              La biblioteca guarda referencias a cuentos, imágenes y música de tu cuenta para que
              puedas encontrarlos y reutilizarlos. Eliminar una entrada de la biblioteca quita esa
              referencia; no elimina por sí mismo el cuento o archivo original.
            </p>
          </section>

          <section id="disponibilidad">
            <h2>7. Disponibilidad y cambios</h2>
            <p>
              Tale Star puede cambiar sus funciones y tener interrupciones por mantenimiento o
              incidencias técnicas. Si estas condiciones cambian, la versión actualizada se mostrará
              en esta página con su fecha correspondiente.
            </p>
          </section>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.terms-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at 12% 4%, rgba(230, 219, 254, 0.96) 0 10%, transparent 31%),
    radial-gradient(circle at 82% 16%, rgba(177, 148, 254, 0.78) 0 13%, transparent 37%),
    linear-gradient(150deg, #f8f6ff 0%, #e8e0ff 42%, #c7b4ff 100%);
}

.terms-wrap {
  width: min(100%, 920px);
  margin: 0 auto;
}

.terms-topbar,
.terms-brand {
  display: flex;
  align-items: center;
}

.terms-topbar {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.terms-brand {
  gap: 10px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
}

.terms-brand img {
  width: 38px;
  height: 38px;
  border-radius: 12px;
}

.terms-back {
  color: #5b3dfa;
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.terms-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  background: #fff;
  box-shadow: var(--shadow-lg);
}

.terms-intro {
  padding: 38px 44px 28px;
  background: linear-gradient(135deg, #fff 0%, #f3eeff 100%);
}

.terms-intro h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1.12;
}

.terms-intro p {
  max-width: 680px;
  margin: 13px 0 14px;
  color: var(--text-2);
  font-size: 15px;
  line-height: 1.65;
}

.terms-date {
  color: var(--text-2);
  font-size: 12px;
}

.terms-index {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 20px 44px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.terms-index a {
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: #4930bc;
  font-size: 12px;
  font-weight: 700;
}

.terms-index a:hover {
  background: var(--ts-purple-100);
}

.terms-content {
  display: grid;
  gap: 30px;
  padding: 34px 44px 48px;
}

.terms-content section {
  scroll-margin-top: 20px;
}

.terms-content h2 {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 20px;
}

.terms-content p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.8;
}

.terms-content p + p {
  margin-top: 12px;
}

@media (max-width: 600px) {
  .terms-page { padding: 14px; }
  .terms-topbar { padding: 0 4px; }
  .terms-back { font-size: 12px; }
  .terms-intro { padding: 28px 22px 24px; }
  .terms-index { padding: 18px 22px; }
  .terms-content { padding: 28px 22px 36px; }
}
</style>
