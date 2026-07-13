// Avisa al bot de Discord (servicio aparte en Render) de que algo cambió,
// para que actualice el canal correspondiente al instante en vez de
// esperar a su chequeo periódico de 5 minutos.
//
// Nunca lanza error ni bloquea la respuesta al usuario — si el bot está
// dormido, caído, o mal configurado, esto simplemente no hace nada. El
// chequeo periódico del bot sigue funcionando como respaldo de todas formas.
export function notifyDiscordBot(type) {
    const url = process.env.DISCORD_BOT_URL;
    const secret = process.env.DISCORD_BOT_NOTIFY_SECRET;
    if (!url || !secret) return;

    fetch(`${url.replace(/\/$/, '')}/notify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-notify-secret': secret
        },
        body: JSON.stringify({ type })
    }).catch((error) => {
        console.error('No se pudo avisar al bot de Discord (no es grave):', error.message);
    });
}
