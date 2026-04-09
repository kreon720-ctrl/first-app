'use client'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import swaggerSpec from '@/swagger/swagger.json'

export default function ApiDocsPage() {
  return (
    <div style={{ padding: '0 16px' }}>
      <SwaggerUI spec={swaggerSpec} />
    </div>
  )
}
