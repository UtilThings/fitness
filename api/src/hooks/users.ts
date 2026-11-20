/// <reference path="../../pb_data/types.d.ts" />
onRecordCreateRequest((e) => {
  const { calcularDescuento } = require(`${__hooks}/lib/utils`) as typeof import("../lib/utils");
  const nuevoPrecio = calcularDescuento(100);

  $app.logger().info("Nuevo precio calculado", { precio: nuevoPrecio });

  e.next();
}, "users");

onRecordAuthRequest((e) => {
  // El meta debe asignarse ANTES de e.next(), que es quien serializa y envía la respuesta
  const businessId = e.record?.getString("business");

  if (businessId) {
    const business = $app.findRecordById("businesses", businessId);

    e.meta = {
      ...(e.meta || {}), ...{ business: { name: business.getString("name"), slug: business.getString("slug") } }
    };
  }

  return e.next();
}, "users", "admins");
