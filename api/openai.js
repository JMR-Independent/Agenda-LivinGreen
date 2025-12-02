/**
 * Vercel Serverless Function: OpenAI GPT-4 Vision API Proxy
 *
 * Este endpoint protege la API key de OpenAI manteniéndola en el servidor
 * En vez de exponer la key en el cliente, el frontend llama a este endpoint
 * Optimizado para leer pantallazos de WhatsApp y Messenger
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
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error('OPENAI_API_KEY not configured');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'OpenAI API key not configured in Vercel environment variables'
            });
        }

        // Obtener el body de la request (imágenes en base64)
        const { images, prompt } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'At least one image is required'
            });
        }

        // Prompt optimizado para WhatsApp/Messenger screenshots
        const defaultPrompt = `Eres un asistente experto en leer pantallazos de WhatsApp y Messenger. Analiza esta imagen de conversación y extrae TODOS los datos relevantes de la cita/trabajo.

CAMPOS A EXTRAER:
1. NOMBRE COMPLETO del cliente (nombre y apellido si está disponible)
2. HORA de la cita en formato 24h (ej: "14:30", "09:00")
3. DÍA DE LA SEMANA (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
4. CIUDAD donde se realizará el trabajo
5. DIRECCIÓN COMPLETA (número, calle, ciudad, código postal si está)
6. TRABAJO/SERVICIO a realizar (limpieza, deep clean, carpet cleaning, office cleaning, etc.)
7. PRECIO en dólares (solo el número, sin símbolo)

INSTRUCCIONES CRÍTICAS PARA EL NOMBRE:
- El NOMBRE puede estar en varios lugares. Busca en TODOS estos sitios:
  * Nombre del contacto en la parte superior de WhatsApp/Messenger
  * Firma al final de los mensajes (ej: "Gracias, Juan")
  * Presentación en el mensaje (ej: "Hola, soy María", "Mi nombre es Pedro")
  * Cualquier parte del texto donde se mencione un nombre propio
- Si ves un nombre de contacto arriba (ej: "Juan Pérez", "Maria Garcia"), úsalo como el nombre
- Si solo ves un nombre (ej: "Juan"), usa ese nombre
- El nombre NUNCA debe estar vacío si hay un nombre de contacto visible

INSTRUCCIONES PARA LA FECHA:
- Si encuentras una fecha específica (ej: "20 de diciembre", "December 20", "12/20"), calcula qué día de la semana es
- Asume que estamos en 2025 si no se especifica el año
- Convierte la fecha al día de la semana en español: lunes, martes, miércoles, jueves, viernes, sábado, domingo
- Si solo dice un día (ej: "el viernes", "el martes"), usa ese día directamente

OTRAS INSTRUCCIONES:
- Lee TODO el texto visible en la conversación, incluyendo mensajes del cliente y respuestas
- La HORA puede estar en cualquier formato: "10:30", "2:00 PM", "14:00", "10.30", "2 PM", "3 de la tarde", "mañana a las 11", etc. Conviértela SIEMPRE a formato 24h (HH:MM)
- La dirección puede estar en formato Utah (ej: "123 N 456 W") o formato estándar (ej: "123 Main Street")
- El precio puede aparecer como "$150", "150 dólares", "ciento cincuenta", etc.
- Si un dato NO está visible después de buscar exhaustivamente, deja ese campo con cadena vacía ""
- NO inventes información que no esté en la imagen

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional:
{
  "name": "nombre completo del cliente",
  "time": "HH:MM en formato 24h",
  "day": "día de la semana en español (lunes, martes, etc.)",
  "city": "ciudad",
  "address": "dirección completa",
  "job": "descripción del trabajo/servicio",
  "price": "precio en número"
}`;

        // Construir el contenido del mensaje con todas las imágenes
        const content = [
            {
                type: "text",
                text: prompt || defaultPrompt
            }
        ];

        // Agregar todas las imágenes al contenido
        images.forEach((imageBase64) => {
            content.push({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: "high" // Alta resolución para mejor precisión
                }
            });
        });

        // Llamar a OpenAI API
        const openaiResponse = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o", // Modelo más reciente con soporte de visión
                    messages: [
                        {
                            role: "user",
                            content: content
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.1 // Baja temperatura para respuestas más precisas y consistentes
                })
            }
        );

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            console.error('OpenAI API error:', errorData);

            // Mensaje de error más específico según el código de estado
            let userMessage = 'Failed to process image with OpenAI';
            if (openaiResponse.status === 401) {
                userMessage = 'API Key inválida o expirada. Verifica tu OpenAI API key en Vercel.';
            } else if (openaiResponse.status === 429) {
                userMessage = 'Límite de requests excedido. Has superado tu cuota de OpenAI.';
            } else if (openaiResponse.status === 400) {
                userMessage = 'Request inválido. Verifica el formato de la imagen.';
            }

            return res.status(openaiResponse.status).json({
                error: 'OpenAI API error',
                message: errorData.error?.message || userMessage,
                userMessage: userMessage,
                statusCode: openaiResponse.status,
                details: errorData,
                help: openaiResponse.status === 401
                    ? 'Ve a Vercel → Settings → Environment Variables y verifica que OPENAI_API_KEY esté configurada correctamente'
                    : null
            });
        }

        // Retornar respuesta exitosa
        const data = await openaiResponse.json();

        // Extraer y limpiar la respuesta JSON del modelo
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content;

            // Intentar parsear el JSON de la respuesta
            try {
                let cleanContent = content.trim();

                // Remover markdown code blocks si existen
                if (cleanContent.startsWith('```json')) {
                    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (cleanContent.startsWith('```')) {
                    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }

                const parsedData = JSON.parse(cleanContent);

                return res.status(200).json({
                    success: true,
                    data: parsedData,
                    raw: data // Incluir respuesta completa para debugging
                });
            } catch (parseError) {
                console.error('Failed to parse OpenAI response as JSON:', parseError);

                // Si falla el parseo, retornar la respuesta raw para que el cliente intente extraer manualmente
                return res.status(200).json({
                    success: false,
                    message: 'Response received but failed to parse as JSON',
                    raw: data,
                    content: content
                });
            }
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('OpenAI API proxy error:', error);

        return res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Failed to process request',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
