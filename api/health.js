/**
 * Health Check Endpoint - Verifica configuración de APIs
 *
 * Este endpoint permite verificar que las variables de entorno
 * están configuradas correctamente en Vercel
 */

export default async function handler(req, res) {
    // Permitir GET y POST
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only GET and POST requests are accepted'
        });
    }

    try {
        const checks = {
            timestamp: new Date().toISOString(),
            environment: process.env.VERCEL_ENV || 'local',
            checks: {}
        };

        // Check 1: Verificar que la API key existe
        const visionApiKey = process.env.GOOGLE_VISION_API_KEY;
        checks.checks.visionApiKeyConfigured = {
            status: !!visionApiKey,
            message: visionApiKey
                ? `✅ API key configurada (${visionApiKey.substring(0, 10)}...)`
                : '❌ GOOGLE_VISION_API_KEY no está configurada'
        };

        // Check 2: Si está configurada, probar que funciona
        if (visionApiKey) {
            try {
                // Crear una imagen de prueba simple (1x1 pixel blanco en base64)
                const testImage = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/A4Q=';

                const visionResponse = await fetch(
                    `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            requests: [{
                                image: { content: testImage },
                                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
                            }]
                        })
                    }
                );

                if (visionResponse.ok) {
                    checks.checks.visionApiWorking = {
                        status: true,
                        message: '✅ Google Vision API responde correctamente'
                    };
                } else {
                    const errorData = await visionResponse.json();
                    checks.checks.visionApiWorking = {
                        status: false,
                        message: '❌ Google Vision API retorna error',
                        error: errorData.error?.message || 'Error desconocido',
                        statusCode: visionResponse.status,
                        details: errorData
                    };
                }
            } catch (error) {
                checks.checks.visionApiWorking = {
                    status: false,
                    message: '❌ Error al conectar con Google Vision API',
                    error: error.message
                };
            }
        }

        // Determinar el estado general
        const allChecksPass = Object.values(checks.checks).every(check => check.status === true);
        checks.overallStatus = allChecksPass ? 'healthy' : 'unhealthy';

        return res.status(allChecksPass ? 200 : 500).json(checks);

    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({
            overallStatus: 'error',
            error: 'Internal server error',
            message: error.message
        });
    }
}
