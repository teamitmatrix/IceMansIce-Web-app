# Bluetooth Printer Setup Guide

## Supported Printers
- **Infinite Peripherals Model: MP-34-BT**
- **SEWOO Model: LK-PB20**
- Other ESC/POS compatible Bluetooth thermal printers

## Requirements

### Browser Compatibility
- **Chrome on Android** (Recommended)
- **Microsoft Edge on Android**
- **Samsung Internet** (with Bluetooth support)
- **NOT supported**: iOS devices (Safari/Chrome), Desktop browsers (security restrictions)

### Device Requirements
1. Android device with Bluetooth 4.0 or higher
2. Location permissions enabled (required for Bluetooth scanning on Android)
3. Bluetooth enabled on the device

## Setup Instructions

### 1. Pair Your Printer
Before using the app, pair your printer with your Android device:

1. Turn on your Bluetooth printer
2. On your Android device:
   - Go to **Settings** → **Bluetooth**
   - Enable Bluetooth if not already on
   - Look for your printer in the available devices list
   - Tap on your printer name (e.g., "MP-34-BT" or "LK-PB20")
   - Enter the PIN if prompted (usually `0000` or `1234`)
3. Wait for "Connected" or "Paired" status

### 2. Enable Browser Permissions

1. Open Chrome on your Android device
2. Go to **Settings** → **Site Settings** → **Bluetooth**
3. Ensure Bluetooth access is allowed
4. Grant Location permission when prompted (required for Bluetooth)

### 3. Print an Invoice

1. Navigate to the invoice details page
2. Click the **"BT Print"** button
3. A Bluetooth device picker will appear
4. Select your paired printer from the list
5. Wait for the print job to complete

## Troubleshooting

### "Web Bluetooth not supported"
- **Solution**: Use Chrome or Edge on Android. iOS and desktop browsers don't support Web Bluetooth for printers.

### "No Bluetooth printer found"
- **Solution**: 
  - Ensure the printer is turned on and in range
  - Check that the printer is paired in your device's Bluetooth settings
  - Try turning the printer off and on again

### "Connection to printer failed"
- **Solution**:
  - Move closer to the printer (within 10 meters/30 feet)
  - Ensure the printer is not connected to another device
  - Restart the printer and try again
  - Check printer battery level

### "Bluetooth access denied"
- **Solution**:
  - Clear browser data for the site
  - Grant Bluetooth permissions in Chrome settings
  - Ensure Location services are enabled (Android requirement)

### Nothing prints or prints garbled text
- **Solution**:
  - Ensure printer paper is loaded correctly
  - Check that printer is in ESC/POS mode (not line mode)
  - Reset the printer to factory defaults
  - Verify printer compatibility with ESC/POS commands

### Print is cut off or formatted incorrectly
- **Solution**:
  - The app is optimized for 58mm (2-inch) thermal paper
  - Check printer paper width settings
  - Ensure paper is aligned properly in the printer

## Technical Details

### Communication Protocol
- **Protocol**: ESC/POS (Epson Standard Code for Point of Sale)
- **Connection**: Web Bluetooth API
- **Service UUIDs**: Auto-detected from multiple known printer profiles
- **Character Set**: USA ASCII for maximum compatibility
- **Paper Width**: Optimized for 58mm (32 characters per line)

### Supported Features
- ✅ Text printing with formatting (bold, double-size)
- ✅ Text alignment (left, center, right)
- ✅ Line separation (horizontal rules)
- ✅ Paper cut (if supported by printer)
- ✅ Multiple item lines
- ✅ Totals and tax calculation display
- ✅ Company header and footer

### ESC/POS Commands Used
- `ESC @` - Initialize printer
- `ESC t` - Select character code table
- `ESC R` - Select international character set
- `ESC a` - Text alignment
- `ESC E` - Bold on/off
- `GS !` - Character size
- `ESC d` - Print and feed lines
- `GS V` - Cut paper

## Known Limitations

1. **Platform Limitation**: Web Bluetooth only works on Android (Chrome/Edge), not on iOS or desktop
2. **Range**: Standard Bluetooth range is 10 meters (30 feet) in open space
3. **Battery**: Mobile printers have limited battery life; keep charged
4. **Paper Width**: Optimized for standard 58mm thermal paper
5. **Character Set**: Limited to ASCII characters; special symbols may not print correctly

## Printer-Specific Notes

### Infinite Peripherals MP-34-BT
- Default PIN: `0000`
- Battery indicator on device
- Auto-sleep after 5 minutes of inactivity
- Supports continuous paper only (no paper cut)

### SEWOO LK-PB20
- Default PIN: `1234`
- LED status indicators
- Supports paper cutting
- Has "sleep" button for battery conservation

## Best Practices

1. **Keep printer charged**: Charge printer when battery is below 20%
2. **Maintain connection**: Stay within 5 meters while printing
3. **Test print**: Do a test print after pairing to verify setup
4. **Paper quality**: Use quality thermal paper for best results
5. **Clean regularly**: Clean printer head monthly with isopropyl alcohol

## Support

If you continue to experience issues:
1. Check printer manufacturer's documentation
2. Verify printer firmware is up to date
3. Test with the printer manufacturer's official app
4. Contact technical support with error messages and printer model

## Development Notes

The Bluetooth printer implementation includes:
- Auto-detection of printer service UUIDs
- Fallback to multiple known printer profiles
- Chunked data transmission for stability
- Enhanced error handling and user feedback
- Optimized ESC/POS command sequence
- Text wrapping for long addresses and emails
