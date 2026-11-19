import type { HarvestItem } from '../../iot/domain/entities/Iot';

interface DeliveryReceivingRepository {
  getAdminHarvests(params: { orderId: number }): Promise<HarvestItem[]>;
  completeHarvestReceiving(requestId: number): Promise<void>;
}

export async function completeDeliveryReceiving(orderId: number, repository: DeliveryReceivingRepository): Promise<number> {
  const harvests = await repository.getAdminHarvests({ orderId });
  const requests = new Set(harvests.filter((harvest) =>
    harvest.order_id === orderId && harvest.harvest_method === 'DELIVERY' &&
    harvest.status === 'COMPLETED' && harvest.cultivation_status === 'HARVESTING' &&
    harvest.harvest_request_status !== 'COMPLETED' && harvest.harvest_request_status !== 'CANCELLED'
  ).map((harvest) => harvest.harvest_request_id));
  for (const requestId of requests) {
    if (!requestId) throw new Error('Missing harvest receiving request');
    await repository.completeHarvestReceiving(requestId);
  }
  return requests.size;
}
