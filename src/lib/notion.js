// Conexión directa con Notion via fetch (sin SDK externo)
export async function getCartas(databaseId) {
  const token = process.env.NOTION_TOKEN;
  if (!token || !databaseId) {
    console.error("Faltan variables de entorno de Notion");
    return [];
  }

  try {
    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const body = nextCursor ? JSON.stringify({ start_cursor: nextCursor }) : JSON.stringify({});
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: body,
        cache: 'no-store' 
      });

      if (!response.ok) {
        throw new Error(`Error de Notion: ${response.statusText}`);
      }

      const data = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      nextCursor = data.next_cursor;
    }

    // Mapear los resultados
    const cartas = allResults.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        idOriginal: props['ID Original']?.number || 0,
        nombre: (props['Nombre'] || props['Name'])?.title[0]?.plain_text || 'Sin Nombre',
        descripcion: (props['Descripción'] || props['Descripcion'] || props['Descripcin'])?.rich_text[0]?.plain_text || '',
        categoria: (props['Categoría'] || props['Categoria'] || props['Categora'])?.select?.name || 'general',
        tragos: props['Tragos']?.number || null,
        colorHex: props['Color Hex']?.rich_text[0]?.plain_text || '#3b82f6',
        textSize: (props['Tamaño Texto'] || props['Tamao Texto'])?.select?.name || 'text-base'
      };
    });

    // Ordenar por ID original
    return cartas.sort((a, b) => a.idOriginal - b.idOriginal);
  } catch (error) {
    console.error("Error al obtener cartas de Notion:", error);
    return [];
  }
}