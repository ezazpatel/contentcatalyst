
# Blog Post Generator and Publisher (v1.0.0)

A full-stack TypeScript application that generates SEO-optimized blog posts using Claude AI and publishes them to WordPress.

## Core Architecture

### 1. Content Generation Engine (`scheduler.ts`)
The content generation pipeline consists of several key functions:

#### `generateContent(keywords: string[], description: string, post: any)`
Main content generation function that:
- Creates SEO-optimized titles and outlines using Claude AI
- Generates structured content with proper headings
- Handles affiliate product integration
- Manages internal linking
- Processes and embeds product images
- Ensures consistent tone and readability

#### `convertMarkdownToHTML(content: string)`
HTML conversion utility that:
- Transforms markdown headings (H1-H3)
- Processes image tags with alt text
- Handles product slideshows
- Creates proper paragraph spacing
- Maintains link formatting

### 2. Database Layer (`db.ts`)
Uses Neon PostgreSQL with connection handling:
- Connection pooling with max 10 connections
- 30-second idle timeout
- Error event monitoring
- Drizzle ORM integration

### 3. API Routes (`routes.ts`)
RESTful endpoints with comprehensive error handling:

#### Blog Post Management
```typescript
GET /api/posts         // List all posts
GET /api/posts/:id     // Get single post
POST /api/posts        // Create new post
PATCH /api/posts/:id   // Update post
DELETE /api/posts/:id  // Delete post
```

#### WordPress Integration
```typescript
POST /api/wordpress/publish      // Publish single post
POST /api/wordpress/publish-all  // Bulk publish
POST /api/wordpress/test        // Test connection
```

### 4. Scheduler System
Automated content generation and publishing:
- Checks for scheduled posts every 2 minutes
- Handles test mode vs production mode
- Manages WordPress publishing queue
- Provides error recovery

## Key Components

### 1. Image Processing (`services/image-crawler.ts`)
- Crawls affiliate product images
- Matches images with relevant headings
- Handles image caching
- Creates product slideshows

### 2. Content Generation Pipeline
1. **Title & Outline Generation**
   - Creates SEO-friendly titles
   - Structures content with H2/H3 headings
   - Plans affiliate product placement

2. **Introduction Generation**
   - Creates engaging hooks
   - Incorporates keywords naturally
   - Sets up content flow

3. **Section Generation**
   - Creates detailed main sections
   - Handles subheadings
   - Integrates affiliate links
   - Manages internal linking

4. **Conclusion Generation**
   - Summarizes key points
   - Adds call-to-action
   - Maintains consistent tone

### 3. WordPress Integration
Handles publishing with:
- Basic authentication
- Rate limiting
- Image handling
- SEO metadata
- Yoast integration

## Database Schema

### Blog Posts Table
```sql
CREATE TABLE blog_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  keywords TEXT[],
  status TEXT,
  scheduledDate TIMESTAMP,
  publishedDate TIMESTAMP,
  wordpressUrl TEXT,
  affiliateLinks JSONB[],
  affiliateImages JSONB[]
);
```

### Settings Table
```sql
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  test_mode BOOLEAN DEFAULT false,
  wordpress_settings JSONB
);
```

## Content Generation Rules

### SEO Optimization
- Keyword density monitoring
- Header structure (H2, H3)
- Internal linking quotas
- Meta description generation

### Affiliate Integration
- Maximum 2 mentions per product
- Natural placement in headers
- Product slideshow integration
- Link tracking

### Content Quality
- Grade 5-6 reading level
- Natural keyword placement
- Varied sentence structure
- Consistent tone and voice

## Error Handling

1. **Database Errors**
   - Connection retry logic
   - Transaction rollbacks
   - Data validation

2. **API Errors**
   - Rate limit handling
   - Timeout recovery
   - Validation errors

3. **WordPress Errors**
   - Authentication failures
   - Publishing retries
   - Image upload errors

## Development

```bash
# Installation
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Configuration

```env
DATABASE_URL=            # Neon PostgreSQL connection string
ANTHROPIC_API_KEY=      # Claude AI API key
WORDPRESS_API_URL=      # WordPress API endpoint
WORDPRESS_AUTH_TOKEN=   # WordPress authentication token
WORDPRESS_USERNAME=     # WordPress username
```

## Security Features

1. **Database Security**
   - Connection pooling
   - Prepared statements
   - Input validation

2. **API Security**
   - Rate limiting
   - Input sanitization
   - Error masking

3. **WordPress Security**
   - Token authentication
   - API permissions
   - Error logging

## Performance Optimizations

1. **Database**
   - Connection pooling
   - Query optimization
   - Index management

2. **Content Generation**
   - Batch processing
   - Rate limiting
   - Caching

3. **Image Handling**
   - Lazy loading
   - Format optimization
   - Cache management

## Monitoring

1. **System Health**
   - Database connections
   - API response times
   - Error rates

2. **Content Generation**
   - Success rates
   - Processing times
   - Quality metrics

3. **WordPress Publishing**
   - Success rates
   - API response times
   - Error tracking

## Version History

### v1.0.0
- Initial release
- Full content generation pipeline
- WordPress integration
- Image processing
- Scheduling system

