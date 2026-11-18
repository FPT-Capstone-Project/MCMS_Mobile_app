import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type { CreateShipment, Shipment, ShipmentStatus } from '../domain/shipment';

export const shipmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrderShipments: builder.query<Shipment[], { orderId: number; accountId: string }>({
      query: ({ orderId }) => ({ url: API_ENDPOINTS.SHIPMENTS.ORDER(orderId) }),
      transformResponse: (response: { data: Shipment[] }) => response.data,
      providesTags: (_result, _error, { orderId }) => [{ type: 'Shipment', id: orderId }],
      keepUnusedDataFor: 0,
    }),
    updateShipmentStatus: builder.mutation<Shipment, { orderId: number; shipmentId: number; status: ShipmentStatus }>({
      query: ({ shipmentId, status }) => ({ url: API_ENDPOINTS.SHIPMENTS.STATUS(shipmentId), method: 'PATCH', data: { status } }),
      transformResponse: (response: { data: Shipment }) => response.data,
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'Shipment', id: orderId }],
    }),
    createShipment: builder.mutation<Shipment, CreateShipment>({
      query: (data) => ({ url: API_ENDPOINTS.SHIPMENTS.BASE, method: 'POST', data }),
      transformResponse: (response: { data: Shipment }) => response.data,
      invalidatesTags: (_result, _error, shipment) => [{ type: 'Shipment', id: shipment.orderId }],
    }),
  }),
});

export const { useGetOrderShipmentsQuery, useUpdateShipmentStatusMutation, useCreateShipmentMutation } = shipmentApi;
