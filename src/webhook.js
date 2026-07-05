// Envía un aviso a un webhook de Discord. La URL vive SOLO en la variable de
// entorno DISCORD_WEBHOOK — nunca la escribas directamente en el código.
export async function notifyWebhook(deletedCount) {
    const webhookUrl = process.env.DISCORD_WEBHOOK;

    if (!webhookUrl) {
        console.warn('DISCORD_WEBHOOK no está configurado; se omite la notificación.');
        return;
    }

    const message = {
        content: `Se han eliminado ${deletedCount} registros antiguos de archimonstruos.`
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        });
        console.log(`Notificación enviada al webhook: ${deletedCount} registros eliminados.`);
    } catch (error) {
        console.error('Error al enviar la notificación al webhook:', error);
    }
}
