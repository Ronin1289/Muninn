# Supabase Manager Web App

A modern, elegant web interface for managing Supabase database entries. This application provides a beautiful UI to add, view, and delete entries from a Supabase database table.

## Features

- **Modern UI Design**: Dark theme with glassmorphism effects and smooth animations
- **Real-time Database Operations**: Add, view, and delete entries instantly
- **Persistent Configuration**: Saves your Supabase credentials locally for quick reconnection
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Error Handling**: Comprehensive error messages and user feedback
- **Secure**: Uses Supabase's built-in security features

## Prerequisites

Before using this application, you need:

1. A Supabase account and project
2. A table named `test` in your Supabase database with the following structure:
   ```sql
   CREATE TABLE test (
     id BIGSERIAL PRIMARY KEY,
     content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

## Setup Instructions

### 1. Create the Database Table

In your Supabase project's SQL Editor, run:

```sql
CREATE TABLE test (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. Run the Application

Simply open `index.html` in a modern web browser (Chrome, Firefox, Safari, or Edge).

### 4. Connect to Your Database

1. Enter your Supabase URL
2. Enter your Anon Key
3. Click "Connect to Database"

Your credentials will be saved locally, so you won't need to enter them again on subsequent visits.

## Usage

### Adding Entries
1. Type your content in the input field
2. Click "Add Entry" or press Enter
3. The entry will appear in the list below

### Deleting Entries
- **Delete First**: Removes the oldest entry (lowest ID)
- **Delete Last**: Removes the newest entry (highest ID)

### Refreshing the List
Click the "Refresh" button to reload all entries from the database.

## File Structure

```
.
├── index.html      # Main HTML structure
├── index.css       # Styling and animations
├── script.js       # Application logic and Supabase integration
└── README.md       # This file
```

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with custom properties, gradients, and animations
- **JavaScript (ES6+)**: Application logic
- **Supabase JS Client**: Database operations
- **LocalStorage API**: Configuration persistence

## Design Features

- **Dark Theme**: Easy on the eyes with a sophisticated color palette
- **Glassmorphism**: Modern frosted glass effect on cards
- **Smooth Animations**: Micro-interactions for enhanced UX
- **Gradient Accents**: Beautiful purple-blue gradient theme
- **Responsive Layout**: Adapts to all screen sizes
- **Loading States**: Visual feedback during operations
- **Toast Notifications**: Non-intrusive success/error messages

## Security Notes

- The Anon Key is safe to use in client-side applications
- Implement Row Level Security (RLS) policies in Supabase for production use
- Never commit your actual credentials to version control
- Consider using environment variables for production deployments

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Troubleshooting

### Connection Failed
- Verify your Supabase URL and key are correct
- Check that the `test` table exists in your database
- Ensure your Supabase project is active

### Entries Not Showing
- Click the Refresh button
- Check browser console for errors
- Verify table permissions in Supabase

### CORS Errors
- Ensure you're accessing the app via a web server (not `file://`)
- Check Supabase CORS settings if using a custom domain

## Comparison with Original Python App

This web app is equivalent to the original Tkinter Python application with these improvements:

| Feature | Python (Tkinter) | Web App |
|---------|-----------------|---------|
| Platform | Desktop only | Any device with browser |
| UI Design | Basic widgets | Modern, animated interface |
| Configuration | JSON file | LocalStorage (persistent) |
| Deployment | Requires Python | Just open in browser |
| Updates | Manual refresh | Real-time updates |
| Accessibility | Limited | Full keyboard navigation |

## License

This project is open source and available for personal and commercial use.

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.
"# Muninn" 
