#!/usr/bin/env python3
"""
Generador automático de iconos PWA
Recorta el espacio blanco y genera iconos optimizados
"""

from PIL import Image, ImageDraw
import os

def recortar_espacio_blanco(img):
    """Recorta el espacio blanco alrededor del logo"""
    # Convertir a RGBA si no lo es
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Obtener datos de píxeles
    pixels = img.load()
    width, height = img.size

    # Encontrar límites del contenido (no-blanco)
    min_x, min_y = width, height
    max_x, max_y = 0, 0

    # Umbral para considerar un pixel como "blanco" (RGB > 240)
    THRESHOLD = 240

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Si el píxel NO es blanco/gris claro
            if not (r > THRESHOLD and g > THRESHOLD and b > THRESHOLD):
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y

    # Agregar pequeño padding
    padding = 10
    min_x = max(0, min_x - padding)
    min_y = max(0, min_y - padding)
    max_x = min(width - 1, max_x + padding)
    max_y = min(height - 1, max_y + padding)

    # Recortar
    bbox = (min_x, min_y, max_x + 1, max_y + 1)
    img_recortada = img.crop(bbox)

    print(f"Recortado de {img.size} a {img_recortada.size}")
    print(f"Espacio eliminado: {100 * (1 - (img_recortada.size[0] * img_recortada.size[1]) / (img.size[0] * img.size[1])):.1f}%")

    return img_recortada

def crear_icono_con_bordes_redondeados(img_logo, size, radius):
    """Crea un icono con bordes redondeados"""
    # Crear imagen base blanca
    icono = Image.new('RGBA', (size, size), (255, 255, 255, 255))

    # Calcular tamaño del logo - sin recorte, con espacio blanco incluido
    # Usamos 0.92x para respetar el espacio blanco original
    logo_size = int(size * 0.92)

    # Redimensionar logo manteniendo aspecto
    img_logo_resized = img_logo.copy()
    img_logo_resized.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Centrar logo
    x = (size - img_logo_resized.width) // 2
    y = (size - img_logo_resized.height) // 2

    # Crear máscara para bordes redondeados
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)

    # Pegar logo en el centro (manejar transparencia correctamente)
    if img_logo_resized.mode == 'RGBA':
        icono.paste(img_logo_resized, (x, y), img_logo_resized.split()[3])
    else:
        icono.paste(img_logo_resized, (x, y))

    # Aplicar bordes redondeados
    output = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    output.paste(icono, (0, 0), mask)

    # Convertir a RGB para PNG sin transparencia en bordes
    final = Image.new('RGB', (size, size), (255, 255, 255))
    final.paste(output, (0, 0), mask)

    return final

def crear_icono_cuadrado(img_logo, size):
    """Crea un icono cuadrado sin bordes redondeados (para iPhone)"""
    # Crear imagen base blanca
    icono = Image.new('RGB', (size, size), (255, 255, 255))

    # Calcular tamaño del logo - sin recorte, con espacio blanco incluido
    # Usamos 0.92x para respetar el espacio blanco original
    logo_size = int(size * 0.92)

    # Redimensionar logo manteniendo aspecto
    img_logo_resized = img_logo.copy()
    img_logo_resized.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Centrar logo
    x = (size - img_logo_resized.width) // 2
    y = (size - img_logo_resized.height) // 2

    # Pegar logo
    if img_logo_resized.mode == 'RGBA':
        icono.paste(img_logo_resized, (x, y), img_logo_resized)
    else:
        icono.paste(img_logo_resized, (x, y))

    return icono

def main():
    print("Generador Automatico de Iconos PWA")
    print("=" * 50)

    # Ruta del logo original
    logo_path = "logo-gemini.png"

    if not os.path.exists(logo_path):
        print(f"Error: No se encuentra {logo_path}")
        return

    print(f"Cargando logo: {logo_path}")
    img_original = Image.open(logo_path)
    print(f"Tamanio original: {img_original.size}")

    # NO recortar - usar imagen tal cual con su espacio blanco
    print("\nUsando logo sin recorte (manteniendo espacio blanco original)...")
    img_recortada = img_original

    # Configuración de iconos
    iconos = [
        ("apple-touch-icon.png", 180, None, "iPhone/iPad Home Screen"),
        ("favicon-32x32.png", 32, 6, "Favicon 32x32"),
        ("favicon-64x64.png", 64, 12, "Favicon 64x64"),
        ("icon-192x192.png", 192, 38, "Android PWA 192x192"),
        ("icon-512x512.png", 512, 102, "Android PWA 512x512"),
    ]

    print(f"\nGenerando {len(iconos)} iconos optimizados...")
    print("-" * 50)

    for filename, size, radius, description in iconos:
        if radius is None:
            # Icono cuadrado (iPhone)
            icono = crear_icono_cuadrado(img_recortada, size)
            tipo = "cuadrado"
        else:
            # Icono con bordes redondeados
            icono = crear_icono_con_bordes_redondeados(img_recortada, size, radius)
            tipo = f"redondeado (r={radius})"

        icono.save(filename, 'PNG', optimize=True)
        print(f"OK {filename:25} {size}x{size}px {tipo:20} - {description}")

    print("\n" + "=" * 50)
    print("COMPLETADO! Se generaron 5 iconos optimizados:")
    print("   - Logo SIN espacio blanco desperdiciado")
    print("   - Logo ocupa 92% del area del icono")
    print("   - Bordes redondeados para favicons")
    print("   - Listos para usar en iPhone y navegadores")
    print("\nArchivos guardados en la carpeta actual")

if __name__ == "__main__":
    main()
