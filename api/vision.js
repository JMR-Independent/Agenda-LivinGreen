/**
 * Vercel Serverless Function: Google Cloud Vision API Proxy
 *
 * Este endpoint protege la API key de Google Vision manteniéndola en el servidor
 * En vez de exponer la key en el cliente, el frontend llama a este endpoint
 */

export default async function handler(req, res) {
    // Solo permitir POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only POST requests are accepted'
        });
    }

    try {
        // Obtener API key desde variables de entorno (seguro)
        const apiKey = process.env.GOOGLE_VISION_API_KEY;

        if (!apiKey) {
            console.error('GOOGLE_VISION_API_KEY not configured');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'API key not configured'
            });
        }

        // Obtener el body de la request (imagen en base64)
        const { image, features } = req.body;

        if (!image) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Image data is required'
            });
        }

        // Construir request para Google Vision API
        const visionRequest = {
            requests: [{
                image: {
                    content: image // Base64 encoded image
                },
                features: features || [
                    {
                        type: 'TEXT_DETECTION',
                        maxResults: 10
                    }
                ]
            }]
        };

        // Llamar a Google Vision API
        const visionResponse = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(visionRequest)
            }
        );

        if (!visionResponse.ok) {
            const errorData = await visionResponse.json();
            console.error('Google Vision API error:', errorData);

            return res.status(visionResponse.status).json({
                error: 'Vision API error',
                message: errorData.error?.message || 'Failed to process image',
                details: errorData
            });
        }

        // Retornar respuesta exitosa
        const data = await visionResponse.json();

        return res.status(200).json(data);

    } catch (error) {
        console.error('Vision API proxy error:', error);

        return res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Failed to process request'
        });
    }
}
