    variable "backend_image" {
        type        = string
        description = "Docker image for the backend"
    }

    variable "frontend_image" {
        type        = string
        description = "Docker image for the frontend"
    }

    variable "SAS_expiry" {
        type        = string
        description = "Expiry date for SAS token"
    }

    variable "location" {
        type        = string
        description = "Azure region location"
    }

    variable "resource_prefix" {
        type        = string
        description = "Prefix for Azure resources"
    }

    variable "docker_registry_username_backend" {
        type        = string
        description = "Docker registry username for backend"
    }

    variable "docker_registry_password_backend" {
        type        = string
        sensitive   = true
        description = "Docker registry password for backend"
    }

    variable "docker_registry_username_frontend" {
        type        = string
        description = "Docker registry username for frontend"
    }

    variable "docker_registry_password_frontend" {
        type        = string
        sensitive   = true
        description = "Docker registry password for frontend"
    }

    variable "duckdns_domain" {
        type        = string
        description = "DuckDNS domain name"
    }

    variable "duckdns_token" {
        type        = string
        sensitive   = true
        description = "DuckDNS token"
    }

    variable "ssl_certificate_password" {
        type        = string
        sensitive   = true
        description = "SSL certificate password"
    }

    variable "certificate_pfx" {
        type        = string
        sensitive   = true
        description = "SSL certificate in PFX format (base64 encoded)"
    }

    variable "subscription_id" {
        type        = string
        description = "Azure subscription ID"
    }

    variable "mongo_connection_string" {
        type        = string
        sensitive   = true
        description = "MongoDB connection string"
    }

    variable "groq_api_key" {
        type        = string
        sensitive   = true
        description = "GROQ API key"
    }

    variable "groq_gpt_model" {
        type        = string
        description = "GROQ GPT model name"
    }

    variable "ssl_key_base64" {
        type        = string
        sensitive   = true
        description = "SSL private key in base64 format"
    }

    variable "ssl_cert_base64" {
        type        = string
        sensitive   = true
        description = "SSL certificate in base64 format"
    }

    variable "google_api_key" {
        type        = string
        sensitive   = true
        description = "Google API key"
    }

    variable "google_cx" {
        type        = string
        sensitive   = true
        description = "Google Custom Search Engine ID"
    }

    variable "redis_cloud_host" {
        type        = string
        description = "Redis Cloud host address"
    }

    variable "redis_cloud_password" {
        type        = string
        sensitive   = true
        description = "Redis Cloud password"
    }