import { createFileRoute } from "@tanstack/react-router";
import logoT from "@/assets/vialux-logo-t.png";
import { CONTACT_EMAIL, CONTACT_TEL } from "@/lib/vialux/constants";

export const Route = createFileRoute("/privacidad")({
  component: AvisoPrivacidad,
});

const ACTUALIZADO = "31 de julio de 2026";

function Seccion({
  num,
  titulo,
  children,
}: {
  num: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-[48px_1fr] border-b border-border">
      <div className="flex flex-col items-center border-r border-border pt-6">
        <span className="font-mono text-xs font-bold text-[#C79100]">{num}</span>
      </div>
      <div className="px-5 py-6 md:px-8">
        <h2 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C79100]">
          {titulo}
        </h2>
        <div className="space-y-3 text-[13px] leading-relaxed text-[#2E2B27]">
          {children}
        </div>
      </div>
    </section>
  );
}

function AvisoPrivacidad() {
  return (
    <div className="min-h-screen bg-background">
      <div
        style={{
          height: "2px",
          background:
            "linear-gradient(to right, transparent 0%, #C99B0E 20%, #EDBA1A 50%, #C99B0E 80%, transparent 100%)",
        }}
      />
      <header className="border-b border-[#3A3936] bg-[#343331]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <img src={logoT} alt="VIALUX" className="h-9 w-auto" />
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#9B968E]">
            Aviso de Privacidad
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-6">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#7C766A]">
            Documento legal · VIALUX
          </div>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-[0.06em] text-[#2E2B27]">
            Aviso de Privacidad
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#8A857C]">
            Última actualización: {ACTUALIZADO}
          </p>
        </div>

        <div className="border border-border bg-card">
          <Seccion num="00" titulo="Responsable de los datos">
            <p>
              <strong>VIALUX</strong> (señalización vial), con domicilio en Nardo #705,
              Col. Victoria, Monterrey, Nuevo León, México, es responsable del
              tratamiento de los datos personales que usted nos proporciona.
            </p>
            <p>
              Contacto:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL.toLowerCase()}`}
                className="font-semibold text-[#C79100] underline-offset-2 hover:underline"
              >
                {CONTACT_EMAIL.toLowerCase()}
              </a>{" "}
              · Tel. {CONTACT_TEL}
            </p>
          </Seccion>

          <Seccion num="01" titulo="Qué datos tratamos">
            <p>Únicamente los datos necesarios para atender su solicitud comercial:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Nombre de la persona o empresa, y datos de contacto (teléfono, correo electrónico).</li>
              <li>Código postal y localidad de destino, para calcular la entrega o el envío.</li>
              <li>Datos de la cotización: producto, cantidades, precios y condiciones acordadas.</li>
              <li>
                Documentos del pedido que usted o nosotros compartimos (por ejemplo, guías de
                envío, comprobantes de pago o facturas).
              </li>
              <li>
                Mensajes intercambiados por WhatsApp, correo electrónico u otros canales de
                atención, cuando usted nos contacta.
              </li>
            </ul>
            <p>
              No solicitamos ni almacenamos datos sensibles, ni datos financieros como
              números de tarjeta.
            </p>
          </Seccion>

          <Seccion num="02" titulo="Para qué los usamos">
            <p>Las finalidades son exclusivamente las siguientes:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Elaborar y enviar cotizaciones de nuestros productos.</li>
              <li>Atender sus preguntas y dar seguimiento comercial a su solicitud.</li>
              <li>Coordinar la entrega o el envío del pedido.</li>
              <li>Emitir comprobantes y llevar el registro administrativo de las operaciones.</li>
            </ul>
            <p>
              No utilizamos sus datos para publicidad de terceros ni los vendemos,
              rentamos o comercializamos con nadie.
            </p>
          </Seccion>

          <Seccion num="03" titulo="Uso de WhatsApp">
            <p>
              Atendemos solicitudes a través de la Plataforma de WhatsApp Business de Meta.
              Cuando usted nos escribe por ese medio, el contenido de la conversación y su
              número de teléfono se registran en nuestro sistema interno de atención, con la
              única finalidad de darle seguimiento a su solicitud.
            </p>
            <p>
              La transmisión de los mensajes está sujeta además a las políticas de
              privacidad de WhatsApp y Meta. Usted puede dejar de comunicarse con nosotros
              por ese canal en cualquier momento, o solicitarnos que no le escribamos.
            </p>
          </Seccion>

          <Seccion num="04" titulo="Con quién se comparten">
            <p>
              No compartimos sus datos con terceros para fines comerciales. Únicamente los
              tratan los proveedores tecnológicos que hacen posible nuestra operación, y
              solo para prestarnos ese servicio:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Meta Platforms (WhatsApp Business Platform), para la mensajería.</li>
              <li>Google (Google Workspace), para el correo electrónico.</li>
              <li>Supabase, para el alojamiento seguro de nuestra base de datos.</li>
            </ul>
            <p>
              Podremos revelar información cuando exista un requerimiento de autoridad
              competente conforme a la ley aplicable.
            </p>
          </Seccion>

          <Seccion num="05" titulo="Sus derechos (ARCO)">
            <p>
              Usted puede solicitar en cualquier momento el <strong>Acceso</strong>,{" "}
              <strong>Rectificación</strong>, <strong>Cancelación</strong> u{" "}
              <strong>Oposición</strong> al tratamiento de sus datos personales, así como
              revocar su consentimiento o limitar el uso o divulgación de los mismos.
            </p>
            <p>
              Para ejercer estos derechos, escriba a{" "}
              <a
                href={`mailto:${CONTACT_EMAIL.toLowerCase()}`}
                className="font-semibold text-[#C79100] underline-offset-2 hover:underline"
              >
                {CONTACT_EMAIL.toLowerCase()}
              </a>{" "}
              indicando su nombre, el medio de contacto que usó con nosotros y la solicitud
              concreta. Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </Seccion>

          <Seccion num="06" titulo="Conservación y seguridad">
            <p>
              Conservamos los datos mientras exista una relación comercial y por el tiempo
              que exijan las obligaciones fiscales y administrativas aplicables; después se
              eliminan o se anonimizan.
            </p>
            <p>
              Nuestro sistema es de uso interno y requiere autenticación; la información se
              almacena cifrada en tránsito y con acceso restringido al personal de VIALUX.
            </p>
          </Seccion>

          <Seccion num="07" titulo="Cambios a este aviso">
            <p>
              Cualquier modificación a este Aviso de Privacidad se publicará en esta misma
              página, indicando la fecha de la última actualización.
            </p>
          </Seccion>
        </div>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A857C]">
          VIALUX · Señalización vial de precisión · Monterrey, Nuevo León, México
        </p>
      </main>
    </div>
  );
}
