import { baseApi } from '../../../core/api/baseApi';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import type {
  CreateShipment,
  Shipment,
  ShipmentStatus,
  UpdateShipmentDetails,
} from '../domain/shipment';

export const shipmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminShipments: builder.query<Shipment[], void>({
      query: () => ({ url: API_ENDPOINTS.SHIPMENTS.ADMIN_LIST }),
      transformResponse: (response: { data: Shipment[] }) => response.data,
      providesTags: (result) => [
        { type: 'Shipment', id: 'LIST' },
        ...(result || []).map(({ order_id }) => ({ type: 'Shipment' as const, id: order_id })),
      ],
    }),
    getOrderShipments: builder.query<Shipment[], { orderId: number; accountId: string }>({
      query: ({ orderId }) => ({ url: API_ENDPOINTS.SHIPMENTS.ORDER(orderId) }),
      transformResponse: (response: { data: Shipment[] }) => response.data,
      providesTags: (_result, _error, { orderId }) => [{ type: 'Shipment', id: orderId }],
      keepUnusedDataFor: 0,
    }),
    updateShipmentStatus: builder.mutation<
      Shipment,
      { orderId: number; shipmentId: number; status: ShipmentStatus; deliveredAt?: string }
    >({
      query: ({ shipmentId, status, deliveredAt }) => ({
        url: API_ENDPOINTS.SHIPMENTS.STATUS(shipmentId),
        method: 'PATCH',
        data: { status, ...(deliveredAt ? { deliveredAt } : {}) },
      }),
      transformResponse: (response: { data: Shipment }) => response.data,
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Shipment', id: orderId },
        { type: 'Shipment', id: 'LIST' },
      ],
    }),
    updateShipmentDetails: builder.mutation<Shipment, UpdateShipmentDetails>({
      query: ({
        shipmentId,
        carrier,
        trackingCode,
        shippingFee,
        shippedAt,
        deliveredAt,
      }) => ({
        url: API_ENDPOINTS.SHIPMENTS.DETAILS(shipmentId),
        method: 'PATCH',
        data: {
          carrier,
          trackingCode,
          shippingFee,
          shippedAt,
          ...(deliveredAt !== undefined ? { deliveredAt } : {}),
        },
      }),
      transformResponse: (response: { data: Shipment }) => response.data,
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Shipment', id: orderId },
        { type: 'Shipment', id: 'LIST' },
      ],
    }),
    createShipment: builder.mutation<Shipment, CreateShipment>({
      query: (data) => ({ url: API_ENDPOINTS.SHIPMENTS.BASE, method: 'POST', data }),
      transformResponse: (response: { data: Shipment }) => response.data,
      invalidatesTags: (_result, _error, shipment) => [
        { type: 'Shipment', id: shipment.orderId },
        { type: 'Shipment', id: 'LIST' },
      ],
    }),
    confirmDeliveryReceipt: builder.mutation<void, { orderId: number; requestId: number }>({
      query: ({ requestId }) => ({
        url: API_ENDPOINTS.HARVEST_REQUESTS.COMPLETE(requestId),
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Shipment', id: orderId },
        { type: 'Shipment', id: 'LIST' },
        'Order',
        'IoT',
        'Tray',
        'Notification',
      ],
    }),
  }),
});

export const {
  useGetAdminShipmentsQuery,
  useGetOrderShipmentsQuery,
  useUpdateShipmentStatusMutation,
  useUpdateShipmentDetailsMutation,
  useCreateShipmentMutation,
  useConfirmDeliveryReceiptMutation,
} = shipmentApi;
