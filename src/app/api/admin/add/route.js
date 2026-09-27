export const runtime = 'edge';
import { Client } from '@notionhq/client';

export async function POST(req) {
  try {
    const { password, juego, nombre, descripcion, tragos, categoria } = await req.json();

    // Verificación de seguridad
    if (password !== '!DDeng@01106!') {
      return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 401 });
    }

    const notion = new Client({ auth: process.env.NOTION_TOKEN || process.env.NOTION_SECRET });
    
    let dbId = '';
    if (juego === 'toxic') dbId = process.env.NOTION_TOXIC_DB;
    if (juego === 'poker') dbId = process.env.NOTION_POKER_DB;
    
    if (!dbId) {
      return new Response(JSON.stringify({ error: 'Base de datos no configurada para este juego' }), { status: 400 });
    }

    // Preparar propiedades para Notion
    const properties = {
      Name: { title: [{ text: { content: nombre } }] },
      Descripcion: { rich_text: [{ text: { content: descripcion } }] },
    };

    if (tragos) {
      properties.Tragos = { number: Number(tragos) };
    }
    
    if (categoria) {
      properties.Categoria = { select: { name: categoria } };
    }

    await notion.pages.create({
      parent: { database_id: dbId },
      properties: properties,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error Admin API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
