// Conexión directa con Notion via fetch (sin SDK externo)

export async function getCartas(databaseId) {
  const token = process.env.NOTION_TOKEN;

  if (!token || !databaseId) {
    console.error("Faltan variables de entorno de Notion");
    return [];
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      // cache: 'no-store' para que siempre traiga lo ultimo al crear la sala
      cache: 'no-store' 
    });

    if (!response.ok) {
      throw new Error(`Error de Notion: ${response.statusText}`);
    }

    const data = await response.json();

    // Mapear los resultados
    const cartas = data.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        idOriginal: props['ID Original']?.number || 0,
        nombre: props['Nombre']?.title[0]?.plain_text || 'Sin Nombre',
        descripcion: props['Descripción']?.rich_text[0]?.plain_text || '',
        categoria: props['Categoría']?.select?.name || 'general',
        colorHex: props['Color Hex']?.rich_text[0]?.plain_text || '#3b82f6',
        textSize: props['Tamaño Texto']?.select?.name || 'text-base'
      };
    });

    // Ordenar por ID original
    return cartas.sort((a, b) => a.idOriginal - b.idOriginal);
  } catch (error) {
    console.error("Error al obtener cartas de Notion:", error);
    return [];
  }
}
