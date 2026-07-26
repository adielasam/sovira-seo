import Script from 'next/script'

interface SchemaProviderProps {
  schema: Record<string, any>;
  id?: string;
}

export function SchemaProvider({ schema, id = 'schema-org' }: SchemaProviderProps) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="afterInteractive"
    />
  )
}
