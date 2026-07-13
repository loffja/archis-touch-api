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
    if (!url || !secret) {
        console.log(`[discordNotify] Omitido (${type}): faltan DISCORD_BOT_URL o DISCORD_BOT_NOTIFY_SECRET.`);
        return;
    }

    const target = `${url.replace(/\/$/, '')}/notify`;
    console.log(`[discordNotify] Avisando al bot (${type}) → ${target}`);

    fetch(target, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-notify-secret': secret
        },
        body: JSON.stringify({ type })
    })
        .then((res) => {
            console.log(`[discordNotify] Respuesta del bot (${type}): HTTP ${res.status}`);
        })
        .catch((error) => {
            console.error(`[discordNotify] No se pudo avisar al bot (${type}), no es grave:`, error.message);
        });
}
