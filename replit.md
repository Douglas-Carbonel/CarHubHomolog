# Sistema de Gestão Automotiva (CarHub)

## Overview

This is a comprehensive automotive service management system built as a full-stack web application. The system provides complete management capabilities for automotive service shops, including customer management, vehicle tracking, service scheduling, loyalty programs, and detailed reporting. The application features a modern React frontend with a Node.js/Express backend, utilizing PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Management**: React Hook Form with Zod validation
- **Icons**: Lucide React icon library

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Passport.js with local strategy and session management
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **Password Security**: Node.js crypto module with scrypt hashing

### Database Design
- **Primary Database**: PostgreSQL (Supabase hosted)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Node.js pg Pool for database connections

## Key Components

### Authentication System
- **Strategy**: Session-based local authentication with Passport.js
- **User Management**: Role-based access control (admin/technician)
- **Password Security**: Scrypt-based password hashing with salt
- **Session Persistence**: PostgreSQL session store with 7-day TTL
- **Authorization**: Route-level permission checks

### Customer Management
- **Document Validation**: Brazilian CPF/CNPJ validation and formatting
- **Profile Management**: Complete customer information with contact details

### Vehicle Management
- **Comprehensive Tracking**: Brand, model, year, color, and maintenance history
- **Customer Association**: Many-to-one relationship with customers
- **Service History**: Complete service record tracking per vehicle

### Service Management
- **Unified Architecture**: Centralized service management through service_types table
- **Service Items**: Multiple service types per order through service_items junction table
- **Service Types**: Configurable service categories with pricing and descriptions
- **Scheduling**: Date and time-based appointment system with multiple service support
- **Status Tracking**: Complete service lifecycle management
- **Flexible Pricing**: Individual pricing per service item with quantity support




### Reporting System
- **Financial Analytics**: Revenue tracking and service profitability
- **Customer Analytics**: Customer behavior and retention metrics
- **Service Analytics**: Performance metrics for different service types
- **Visual Reports**: Chart-based reporting with Recharts

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Server validates credentials against database
3. Successful authentication creates secure session
4. Session data stored in PostgreSQL for persistence
5. Client receives authentication status via protected routes

### Service Management Flow
1. Customer and vehicle data validated and stored
2. Service appointments scheduled with type and pricing
3. Service status tracked through completion lifecycle
4. Payment processing and service completion recording
5. Payment processing and service completion recording



## External Dependencies

### Production Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI component primitives
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **passport**: Authentication middleware
- **pg**: PostgreSQL client
- **zod**: Runtime type validation
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety and development experience
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database migration management

### Database Provider
- **Supabase**: Managed PostgreSQL hosting with connection pooling

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with ES modules
- **Development Server**: Vite dev server with HMR
- **Database**: Direct connection to Supabase PostgreSQL
- **Session Management**: In-memory development sessions

### Production Environment
- **Build Process**: Vite production build with ESBuild bundling
- **Server Bundle**: ESBuild compilation for Node.js deployment
- **Static Assets**: Optimized and minified frontend assets
- **Database**: Production PostgreSQL with connection pooling
- **Session Storage**: PostgreSQL-based persistent sessions

### Replit Deployment
- **Platform**: Replit autoscale deployment target
- **Port Configuration**: Internal port 5000, external port 80
- **Environment**: Production Node.js environment
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

## Changelog

```
Changelog:
- July 13, 2025. FIXED: PIX generation issues - resolved MercadoPago API errors by fixing payload structure and removing problematic date_of_expiration field that was causing validation errors
- July 13, 2025. ENHANCED: PIX system now uses correct amount values (fixed 0.01 bug) and properly calculates expiration times in Brazil timezone
- July 12, 2025. REFINED: PIX system now maintains exactly 1 record per service - existing PIX records are updated instead of creating duplicates, ensuring clean database structure
- July 12, 2025. ENHANCED: PIX validation shows confirmation dialog for ANY existing PIX (pending, paid, cancelled) giving user choice to use existing QR code or generate new one
- July 10, 2025. ADDED: Smart PIX validation system - automatically detects existing PIX and prompts user with options to use existing or generate new
- July 10, 2025. FIXED: PIX modal now stays on QR Code screen until payment is made or user closes modal - resolved state interference issue that was causing return to form screen
- July 10, 2025. PIX payment flow logic completely refined to match exact user requirements - improved screen flow, automatic PIX detection, and proper confirmation dialogs
- July 10, 2025. PIX payment flow enhanced to match exact business requirements - confirmation dialog updated with proper messaging and button labels
- July 10, 2025. Successfully completed migration from Replit Agent to standard Replit environment - all PIX functionality, database connections, and security practices verified working
- July 10, 2025. SOLVED: Fixed critical database schema issue preventing QR code display - added missing qr_code_base64 and external_reference fields to pix_payments table
- July 10, 2025. Corrected all field name mismatches between code and actual Supabase table structure (qr_code_text, expires_at, paid_at)
- July 10, 2025. Completely redesigned PIX payment modal with modern, consistent design matching the application's visual identity
- July 10, 2025. Fixed QR code generation issues in PIX system - improved error handling and QR code display with proper fallback mechanisms
- July 10, 2025. Enhanced PIX modal with responsive design, better mobile experience, and professional color scheme with gradient backgrounds
- July 10, 2025. Optimized QR code generation algorithm with multiple fallback configurations for maximum compatibility
- July 10, 2025. Successfully completed migration from Replit Agent to standard Replit environment with all PIX functionality working
- July 10, 2025. Integrated MercadoPago PIX payment system - users can now generate PIX QR codes and payment links directly from service orders
- July 10, 2025. Added PIX payment modal with QR code generation, copy-paste functionality, and automatic payment status tracking
- July 10, 2025. Created dedicated pix_payments table for storing PIX transaction data and webhook integration for real-time payment updates
- July 10, 2025. Added PIX button to service cards allowing instant payment generation with pre-filled customer data and remaining balance
- July 10, 2025. Fixed email validation issue in PIX generation - now automatically provides valid default email when customer email is missing or invalid
- July 4, 2025. Added OCR license plate reading functionality using OpenAI GPT-4o vision model - users can now automatically extract license plate information from photos
- July 4, 2025. Implemented comprehensive OCR system with Brazilian license plate validation (old format ABC1234 and Mercosul format ABC1D23)
- July 4, 2025. Added OCR plate reader page with camera capture, file upload, confidence scoring, and clipboard integration
- July 4, 2025. Integrated OCR functionality into dashboard quick actions and sidebar navigation for easy access
- July 4, 2025. Successfully completed migration from Replit Agent to standard Replit environment with proper dependencies and workflow setup
- June 30, 2025. Fixed notification timezone handling for Brazil/São Paulo timezone - reminders now properly calculate timing and show accurate "em X minutos" messages
- June 30, 2025. Added immediate notification sending for past reminder times - when creating a service with a reminder time that has already passed, notification is sent immediately with correct time remaining
- June 30, 2025. Migrated project from Replit Agent to standard Replit environment with proper security and client/server separation
- June 29, 2025. Fixed PDF service order layout - replaced icons with CARHUB logo, simplified header to "Ordem de Serviço", changed "Tipo de Conserto" to "Serviços", improved vehicle description text wrapping with dynamic box height, added footer spacing
- June 29, 2025. Added floating search buttons on schedule and services pages - equal size, same teal/emerald color scheme as main action buttons
- June 29, 2025. Added floating action buttons (search and create) to customers and vehicles pages for UI consistency across all main pages
- June 28, 2025. Completely redesigned schedule page with modern dark theme and improved UX based on user feedback
- June 28, 2025. Reorganized schedule interface into two clear sections: calendar view and filtered appointments list
- June 28, 2025. Implemented functional calendar view modes (Month/Week/Day) with proper Portuguese translations
- June 28, 2025. Removed unnecessary mobile bottom navigation bar for web-focused experience
- June 28, 2025. Enhanced period filters (Hoje/Semana/Mês/Todos) with dynamic counters and clear separation from calendar controls
- June 28, 2025. Added comprehensive week and day view modes with detailed service information display
- June 28, 2025. Improved calendar navigation with previous/next month controls and better visual hierarchy
- June 28, 2025. Successfully completed migration from Replit Agent to standard Replit environment
- January 27, 2025. Documented service architecture consolidation and removed legacy service_extras table
- January 27, 2025. Created comprehensive migration documentation for service management system
- January 27, 2025. Cleaned up legacy tables and verified data integrity of consolidated architecture
- January 18, 2025. Added dedicated modal for multiple appointments per day - mobile users can now tap calendar days to see all appointments in a clean interface
- January 18, 2025. Improved mobile calendar experience - period filters only apply to cards view, better multiple appointments display with enhanced modal
- January 18, 2025. Made admin panel fully responsive for mobile devices - card view for small screens, table view for desktop
- January 18, 2025. Added confirmation dialogs for deletion in admin panel (users, service types, service extras) with consistent UI matching other pages
- January 18, 2025. Fixed currency formatting bug in admin panel - values with commas now convert to dots before database submission
- June 21, 2025. Redesigned dashboard with minimalist professional style - clean cards, improved spacing, modern metrics display
- June 21, 2025. Updated dashboard stats cards with currency formatting, percentage changes, and professional icons
- June 21, 2025. Restructured dashboard layout to match professional design reference with better visual hierarchy
- June 20, 2025. Improved mobile schedule page layout - moved counter next to "Hoje" for mobile devices
- June 27, 2025. Completed migration from Replit Agent to standard Replit environment with full form alignment
- June 27, 2025. Aligned schedule and service forms completely - agenda entries now create services with full functionality
- June 27, 2025. Verified schedule page creates actual service orders with identical form structure, payment management, and notifications
- June 27, 2025. Completed full alignment of schedule and service forms - added payment control, notification settings, and payment methods modal
- June 27, 2025. Restored period filters and custom responsive calendar to agenda page - "Hoje/Semana/Mês/Todos" filters with dynamic counters and mobile-optimized calendar with visual indicators
- June 27, 2025. Implemented mobile-optimized calendar modal for multiple appointments - clicking calendar days with multiple services opens responsive modal showing all appointments with navigation to specific services
- June 27, 2025. Enhanced calendar responsiveness for mobile devices with touch-friendly interactions and optimized modal sizing
- June 26, 2025. Fixed service creation validation error by supporting both serviceExtras and serviceItems formats
- June 26, 2025. Fixed service_items query errors after architecture centralization to service_types table
- June 26, 2025. Simplified service extras endpoint to return empty array for backward compatibility
- June 26, 2025. Restored original responsive layout for service extras grid after user feedback  
- June 26, 2025. Fixed ServiceExtras component to work with centralized service_types table instead of removed service_extras table
- June 26, 2025. Fixed titles to show "Nova Ordem de Serviço" and "Editar Ordem de Serviço" 
- June 26, 2025. Fixed ZodError validation where notes field was null but schema expected string
- June 26, 2025. Restored service extras grid that disappeared - now always shows at least one empty grid on form load
- June 26, 2025. Completely rewrote ServiceExtras component to work with new architecture (services, service_types, service_items)
- June 26, 2025. ServiceExtras now correctly manages ServiceItemRow objects instead of legacy ServiceExtraRow objects
- June 24, 2025. Completed major architectural consolidation: centralized all service logic in service_types table
- June 24, 2025. Updated all APIs and database queries to use centralized service management approach
- June 24, 2025. Maintained backward compatibility for existing frontend code during transition
- June 24, 2025. Implemented complete push notification system for service reminders
- June 24, 2025. Added real-time notifications that work even when browser is closed
- June 24, 2025. Users can set reminders 15-30 minutes before scheduled services
- June 24, 2025. Created notification management page with subscription controls
- June 20, 2025. Removed loyalty/fidelization functionality from the system
- June 20, 2025. Added payment status filters to services page (Pagos, Pendentes, Parcial)
- June 20, 2025. Fixed photo deletion preventing form submission with proper event handling
- January 18, 2025. Fixed photo management issues - photos now refresh properly in cards after camera capture and deletion doesn't close edit modal
- January 18, 2025. Fixed vehicles page data loading issue - added missing queryFn to useQuery hooks
- January 18, 2025. Fixed React Select component empty value error in vehicles page
- January 2025. Migration from Replit Agent to standard Replit completed successfully
- January 2025. Fixed JSX syntax errors and cleaned up service resume modal interface
- January 2025. Added Portuguese status translation in service resume modal for better localization
- January 2025. Removed service extras/adicionais tab from admin panel and fixed storage errors to reflect unified service architecture
- January 2025. Optimized mobile view for service extras grid - compact 2-line layout with observation modal for better mobile UX
- January 2025. Optimized mobile filters layout in services page - improved spacing and button sizing for better mobile experience
- June 19, 2025. Added photo category selection during capture and upload (Vehicle, Damage, Before, After, Other)
- June 19, 2025. Enhanced temporary photos display with category labels for new vehicle creation
- June 19, 2025. Implemented automatic image compression for all photo uploads (camera and file upload)
- June 19, 2025. Optimized image storage: photos now compressed to max 800px width, JPEG quality 80%
- June 19, 2025. Fixed vehicle photo capture during creation - photos now save correctly when creating new vehicles
- June 19, 2025. Increased Express payload limit to 50MB to support base64 image uploads
- June 19, 2025. Fixed critical bug: service extras now save correctly and load in edit mode
- June 19, 2025. Enhanced payment status indicators with prominent colors and badges
- June 19, 2025. Reorganized service form UI with improved payment and value sections
- June 19, 2025. Implemented comprehensive payment methods modal (PIX, Cash, Check, Card)
- June 19, 2025. Enhanced service resume modal with complete service overview
- June 19, 2025. Improved service values section with detailed base service and extras display
- January 2025. Successfully completed migration from Replit Agent to standard Replit environment
- January 2025. Fixed JSX syntax errors in vehicles.tsx component
- January 2025. Installed missing tsx dependency for TypeScript execution
- June 18, 2025. Fixed photos database schema and constraints - camera functionality now working
- June 18, 2025. Implemented custom photos storage layer to handle database structure mismatch
- June 15, 2025. Dashboard migrado para Replit com dados reais do Supabase
- June 15, 2025. Corrigido sistema de autenticação e APIs do dashboard
- June 15, 2025. Implementado dashboard funcional com gráficos e estatísticas em tempo real
- June 14, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Working approach: Only perform requested tasks, ask permission for any intervention outside the specific scope.
Mobile-first approach: Application is designed for mobile use - all changes and improvements must be responsive and optimized for mobile devices.
```