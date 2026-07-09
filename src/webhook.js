// Envía avisos a webhooks de Discord. Las URLs viven SOLO en variables de
// entorno — nunca las escribas directamente en el código.
//
// Hay DOS webhooks distintos:
// - DISCORD_WEBHOOK: avisos de limpieza automática (registros borrados).
// - DISCORD_WEBHOOK_LICENSES: avisos de uso de licencias (canal separado).
async function sendDiscordMessage(webhookUrl, payload) {
    if (!webhookUrl) {
        console.warn('Webhook de Discord no configurado; se omite la notificación.');
        return;
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Error al enviar la notificación al webhook:', error);
    }
}

export async function notifyWebhook(deletedCount) {
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK, {
        content: `Se han eliminado ${deletedCount} registros antiguos de archimonstruos.`
    });
    console.log(`Notificación enviada al webhook: ${deletedCount} registros eliminados.`);
}

// Avisa cuando alguien usa con éxito una licencia para revelar una posición.
// Usa un webhook DISTINTO al de arriba (DISCORD_WEBHOOK_LICENSES).
export async function notifyLicenseUsed({ pcId, archimonsterName, server }) {
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_LICENSES, {
        embeds: [
            {
                title: '🔓 Licencia utilizada',
                color: 3066993,
                fields: [
                    { name: 'Archimonstruo', value: archimonsterName, inline: true },
                    { name: 'Servidor', value: server, inline: true },
                    { name: 'PC ID', value: pcId, inline: true }
                ]
            }
        ]
    });
}
