export function initWebUSB(ops = {}) {
  const onDisconnect = ops.onDisconnect ?? null;

  let that = {};
  that.isConnected = false;
  let device = null;
  that.device = device;

  async function webusb_forget() {
    await device.close();
    that.isConnected = false;
  }

  let endpointNumber = 0;
  // get usb devices
  async function webusb_getdevices() {
    device = await navigator.usb.requestDevice({ filters: [{}] });
    await device.open();

    let configuration = device.configuration;
    if (!configuration) {
      console.log("Device not configured. Selecting configuration...");
      await device.selectConfiguration(1); // Assuming the device has at least one configuration
      configuration = device.configuration;
      console.log(configuration);
    }

    for (let outerface of configuration.interfaces) {
      for (let endpoint of outerface.alternate.endpoints) {
        if (endpoint.direction === "out") {
          console.log("Found OUT endpoint:", endpoint.endpointNumber);
          endpointNumber = endpoint.endpointNumber;
          // This is your OUT endpoint number you can use with transferOut
        }
      }
    }

    await device.selectConfiguration(1);
    await device.claimInterface(0);
    that.isConnected = true;

    navigator.usb.addEventListener("disconnect", (event) => {
      if (event.device === device) {
        if (onDisconnect) onDisconnect();
        that.isConnected = false;
      }
    });
  }

  async function data_send(msg) {
    let result = [];
    console.log("sending message", msg);
    // split msg into a characters array
    for (let i = 0; i < msg.length; i++) {
      let code = msg.charCodeAt(i);
      result.push(code);
    }
    // convert the array into Uinst8Array
    result = Uint8Array.from(result);
    // write the result to webusb
    await device.transferOut(endpointNumber, result);
  }

  that.connect = webusb_getdevices;
  that.disconnect = webusb_forget;
  that.send = data_send;

  return that;
}
