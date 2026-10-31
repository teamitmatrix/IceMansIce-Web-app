// Web Bluetooth utility to send ESC/POS data to a Bluetooth printer
// Note: Support varies by platform/browser. Chrome on Android generally supports Web Bluetooth.

// Use broad compatible UUID types to avoid DOM lib version pitfalls
type TBluetoothServiceUUID = number | string;
type TBluetoothCharacteristicUUID = number | string;

export type BluetoothPrinterOptions = {
  serviceUUID?: TBluetoothServiceUUID;
  characteristicUUID?: TBluetoothCharacteristicUUID;
  chunkSize?: number; // bytes per write
};

// Known printer service/characteristic UUIDs
// Many thermal printers use Serial Port Profile (SPP) over Bluetooth
const PRINTER_CONFIGS = [
  // Generic/Common printers (try first)
  { serviceUUID: 0xffe0, characteristicUUID: 0xffe1 },
  // Serial Port Profile UUID (common for thermal printers)
  { serviceUUID: '00001101-0000-1000-8000-00805f9b34fb', characteristicUUID: 0xffe1 },
  // Alternative generic service
  { serviceUUID: 0x1800, characteristicUUID: 0x2a00 },
  // Infinite Peripherals and SEWOO often use SPP
  { serviceUUID: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristicUUID: '49535343-1e4d-4bd9-ba61-23c647249616' },
];

const DEFAULT_SERVICE: TBluetoothServiceUUID = 0xffe0;
const DEFAULT_CHAR: TBluetoothCharacteristicUUID = 0xffe1;

export async function sendToBluetoothPrinter(data: Uint8Array, opts: BluetoothPrinterOptions = {}) {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth not supported in this environment.');
  }
  
  const bluetooth = (navigator as any).bluetooth;
  if (!bluetooth) throw new Error('Bluetooth API unavailable on this device/browser.');

  // If specific UUIDs provided, use them
  if (opts.serviceUUID) {
    const serviceUUID = opts.serviceUUID;
    const characteristicUUID = opts.characteristicUUID || DEFAULT_CHAR;
    const chunkSize = Math.max(20, Math.min(512, opts.chunkSize || 512));
    
    const device = await bluetooth.requestDevice({
      filters: [{ services: [serviceUUID] as any }],
      optionalServices: [serviceUUID] as any,
    });

    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(serviceUUID as any);
    const characteristic = await service.getCharacteristic(characteristicUUID as any);

    // Write in chunks
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
      // Small delay between chunks for stability
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    try { await device.gatt?.disconnect(); } catch {}
    return;
  }

  // Try to auto-detect printer by attempting multiple service UUIDs
  let lastError: Error | null = null;
  
  // Build a list of all known service UUIDs to try
  const allServices = PRINTER_CONFIGS.map(c => c.serviceUUID);
  
  // Request device with all possible services
  let device;
  try {
    device = await bluetooth.requestDevice({
      // Accept any device with any of these services
      acceptAllDevices: true,
      optionalServices: allServices as any,
    });
  } catch (error: any) {
    throw new Error('No Bluetooth printer selected. Please select a printer and try again.');
  }

  if (!device) {
    throw new Error('No device selected');
  }

  const server = await device.gatt!.connect();
  
  // Try each configuration until one works
  for (const config of PRINTER_CONFIGS) {
    try {
      const service = await server.getPrimaryService(config.serviceUUID as any);
      const characteristic = await service.getCharacteristic(config.characteristicUUID as any);
      
      const chunkSize = Math.max(20, Math.min(512, opts.chunkSize || 512));
      
      // Write in chunks
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        // Small delay between chunks for stability
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Success! Clean up and return
      try { await device.gatt?.disconnect(); } catch {}
      return;
      
    } catch (error: any) {
      lastError = error;
      // This config didn't work, try the next one
      continue;
    }
  }

  // If we get here, none of the configurations worked
  try { await device.gatt?.disconnect(); } catch {}
  
  throw new Error(
    `Could not communicate with printer. The printer may not be compatible or may use a different protocol. ` +
    `Last error: ${lastError?.message || 'Unknown error'}`
  );
}
