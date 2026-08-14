import html from '../index.html';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Submit form
    if (request.method === 'POST' && url.pathname === '/submit-form') {
      const adminKey = url.searchParams.get('key');
      const hasValidAdminKey = adminKey === env.ADMIN_KEY;
      try {
        const contentType = request.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
          data = await request.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          data = Object.fromEntries(formData);
        } else {
          return new Response(JSON.stringify({ error: 'Invalid content type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // Validate required fields based on form type
        const { formType = 'contact', name, email, company, message } = data;

        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          return new Response(JSON.stringify({ error: 'Valid email is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // Store in KV with timestamp as key
        const timestamp = new Date().toISOString();
        const key = `${formType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const submission = {
          timestamp,
          formType,
          name: name || '',
          email,
          company: company || '',
          message: message || '',
          ip: request.headers.get('cf-connecting-ip') || 'unknown',
        };

        await env.FORMS.put(key, JSON.stringify(submission));

        return new Response(JSON.stringify({ success: true, id: key }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (error) {
        console.error('Form submission error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process submission' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Get all submissions (requires admin key)
    if (request.method === 'GET' && url.pathname === '/submissions') {
      const adminKey = url.searchParams.get('key');
      const hasValidAdminKey = adminKey === env.ADMIN_KEY;
      if (!hasValidAdminKey) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        const list = await env.FORMS.list();
        const submissions = [];

        for (const item of list.keys) {
          const data = await env.FORMS.get(item.name);
          if (data) {
            submissions.push(JSON.parse(data));
          }
        }

        // Sort by timestamp descending
        submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return new Response(JSON.stringify(submissions), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Fetch submissions error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch submissions' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve HTML for all other requests
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  },
};
