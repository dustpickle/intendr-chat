# Chat Widget Funnel System

The Chat Widget Funnel System is a modular lead generation system that seamlessly integrates with the chat widget to provide guided user experiences for specific actions like scheduling tours, job inquiries, and resident support.

## Features

- **Seamless Integration**: Smooth transition between chat and funnel modes
- **Location Selection**: Search and geolocation-based location picker
- **Interactive Calendar**: Date selection with visual calendar widget
- **Time Slot Selection**: Configurable time slots (default: 9 AM - 5 PM)
- **Contact Forms**: Validated contact information collection
- **Lead Submission**: Automatic submission to configured webhook
- **Progress Tracking**: Visual progress indicator through funnel steps
- **Mobile Responsive**: Optimized for all device sizes

## Funnel Types

### 1. Schedule Tour Funnel
- **Steps**: Location → Date/Time → Contact Information
- **Features**: Location search, calendar widget, time slot selection
- **Webhook**: Submits tour scheduling leads

### 2. Job Inquiry Funnel
- **Steps**: Contact Information
- **Features**: Direct contact form
- **Webhook**: Submits job inquiry leads

### 3. Resident Inquiry Funnel
- **Steps**: Contact Information
- **Features**: Direct contact form
- **Webhook**: Submits resident support leads

## Configuration

### Basic Configuration

Add funnel configuration to your `ChatWidgetCustomConfig`:

```javascript
window.ChatWidgetCustomConfig = {
  funnels: {
    scheduleTour: {
      enabled: true,
      title: 'Schedule a Tour',
      steps: ['location', 'datetime', 'contact'],
      locations: [
        {
          id: 'location-1',
          name: 'Aegis Living - Bellevue',
          address: '14800 Main Street',
          city: 'Bellevue',
          state: 'WA',
          zip: '98007',
          latitude: 47.6101,
          longitude: -122.2015
        }
        // Add more locations...
      ],
      timeSlots: {
        startHour: 9,
        endHour: 17,
        duration: 60 // minutes
      }
    },
    jobInquiry: {
      enabled: true,
      title: 'Job Inquiry',
      steps: ['contact']
    },
    residentInquiry: {
      enabled: true,
      title: 'Existing Resident Inquiry',
      steps: ['contact']
    }
  }
};
```

### Location Configuration

Each location should include:
- `id`: Unique identifier
- `name`: Display name
- `address`: Street address
- `city`, `state`, `zip`: Location details
- `latitude`, `longitude`: For geolocation features

## Triggering Funnels

### 1. Action Button Triggers

Use the `[funnel]` tag in bot messages:

```javascript
// In your n8n webhook response
"[funnel type=\"scheduleTour\" btntext=\"Schedule Tour\"]Schedule a Tour[/funnel]"
"[funnel type=\"jobInquiry\" btntext=\"Apply Now\"]Job Inquiry[/funnel]"
"[funnel type=\"residentInquiry\" btntext=\"Get Help\"]Resident Inquiry[/funnel]"
```

### 2. Direct Function Calls

Call funnel functions directly:

```javascript
// Start a specific funnel
window.IntendrStartFunnel('scheduleTour');

// Show/hide funnel panel
window.IntendrShowFunnelPanel();
window.IntendrHideFunnelPanel();
```

### 3. Initial Buttons

Configure initial buttons in `ChatWidgetConfig`:

```javascript
window.ChatWidgetConfig = {
  // ... other config
  initialButtons: [
    {
      text: 'Schedule a Tour',
      message: 'I would like to schedule a tour of one of your communities.'
    },
    {
      text: 'Job Opportunities',
      message: 'I am interested in job opportunities at Aegis Living.'
    }
  ]
};
```

## Webhook Integration

### Lead Submission Endpoint

The funnel system submits leads to: `https://automation.cloudcovehosting.com/webhook/aegis-submit-lead`

### Request Body Format

```json
{
  "client": "Aegis Living",
  "chatbotId": "b1bdfe90-cbf0-4d3a-8e4b-fa3359344b57",
  "sessionId": "[current-chat-session-id]",
  "leadname": "[User's name]",
  "leadphone": "[user's phone]",
  "leademail": "[user's email]",
  "leadtype": "[Tour|Job Inquiry|Resident Inquiry]",
  "leadnotes": "[user message]",
  "tourdateandtime": "[xx/xx/xxxx 5PM]" // Only for tour leads
}
```

### Field Descriptions

- `client`: Business name from configuration
- `chatbotId`: Extracted from webhook URL
- `sessionId`: Current chat session ID
- `leadname`: User's full name
- `leadphone`: User's phone number
- `leademail`: User's email address
- `leadtype`: Type of lead (Tour, Job Inquiry, Resident Inquiry)
- `leadnotes`: Optional message from user
- `tourdateandtime`: Tour date and time (only for tour leads)

## User Experience Flow

### Schedule Tour Flow

1. **Trigger**: User clicks "Schedule a Tour" button or types intent
2. **Location Selection**: 
   - Search locations by name, city, or zip code
   - Use geolocation to find nearest location
   - Select from list of available locations
3. **Date/Time Selection**:
   - Interactive calendar widget
   - Select available date
   - Choose time slot (9 AM - 5 PM, 1-hour blocks)
4. **Contact Information**:
   - First Name, Last Name (required)
   - Email Address (required)
   - Phone Number (required)
   - Optional message
5. **Submission**:
   - Form validation
   - Lead submission to webhook
   - Success confirmation
   - Return to chat with summary

### Job/Resident Inquiry Flow

1. **Trigger**: User clicks inquiry button or types intent
2. **Contact Information**:
   - Same form as tour funnel
   - No location or date/time selection
3. **Submission**:
   - Form validation
   - Lead submission to webhook
   - Success confirmation
   - Return to chat with summary

## Styling and Customization

### CSS Variables

The funnel system uses the same CSS variables as the chat widget:

```css
:root {
  --chat--color-primary: #003f72;
  --chat--color-secondary: #0056b3;
}
```

### Custom Styling

All funnel elements use the `.intendr-chat-widget` prefix for scoping:

```css
.intendr-chat-widget .funnel-panel { /* Funnel panel styles */ }
.intendr-chat-widget .location-item { /* Location item styles */ }
.intendr-chat-widget .calendar-day { /* Calendar day styles */ }
.intendr-chat-widget .time-slot { /* Time slot styles */ }
```

## Mobile Responsiveness

The funnel system is fully responsive with mobile-specific optimizations:

- Stacked layout for small screens
- Touch-friendly button sizes
- Optimized calendar grid
- Responsive form layouts

## Error Handling

### Form Validation

- Required field validation
- Email format validation
- Phone number validation
- Real-time validation feedback

### Network Errors

- Graceful error handling for webhook failures
- User-friendly error messages
- Retry mechanisms for failed submissions

### Geolocation Errors

- Fallback to manual location selection
- Clear error messaging
- Graceful degradation

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Geolocation API support (optional)
- Local Storage for session persistence

## Testing

### Demo Page

Use `demo-funnel.html` to test the funnel system:

1. Open the demo page
2. Click the chat widget to open
3. Use test buttons to trigger different funnels
4. Test location selection, calendar, and form submission

### Manual Testing

```javascript
// Test funnel triggers
window.IntendrStartFunnel('scheduleTour');

// Test action button parsing
const message = '[funnel type="scheduleTour" btntext="Schedule Tour"]Schedule a Tour[/funnel]';
// This would be processed by the chat widget
```

## Troubleshooting

### Common Issues

1. **Funnel not showing**: Check if funnel is enabled in configuration
2. **Locations not loading**: Verify location array format
3. **Webhook errors**: Check endpoint URL and request format
4. **Styling issues**: Ensure CSS variables are properly set

### Debug Mode

Enable console logging for debugging:

```javascript
// Check funnel configuration
console.log(window.MERGED_CONFIG.funnels);

// Check current funnel state
console.log(window.currentFunnel, window.funnelData);
```

## Future Enhancements

- Multi-step forms for complex funnels
- File upload capabilities
- Integration with CRM systems
- Advanced validation rules
- Custom funnel templates
- Analytics and tracking
- A/B testing support

## Support

For issues or questions about the funnel system:

1. Check the browser console for error messages
2. Verify configuration format
3. Test with the demo page
4. Review webhook endpoint configuration

The funnel system is designed to be modular and extensible, allowing for easy customization and additional funnel types as needed. 