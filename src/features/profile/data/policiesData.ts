export interface PolicyItem {
  id: string;
  title: string;
  documentTitle: string;
  subtitle: string;
  effectiveDate: string;
  badge: string;
  icon: string;
  summary: string;
  content: string;
}

export interface AboutUsInfo {
  name: string;
  systemName: string;
  tagline: string;
  description: string;
  mission: string;
  highlights: {
    title: string;
    description: string;
    icon: string;
  }[];
  contact: {
    entity: string;
    email: string;
    phone: string;
    address: string;
  };
}

export const ABOUT_US_INFO: AboutUsInfo = {
  name: 'SmartMush Farm',
  systemName: 'SmartMush – Smart Mushroom Cultivation Management System',
  tagline: 'Hệ sinh thái Quản lý & Giám sát Nuôi trồng Nấm Thông minh',
  description:
    'SmartMush là nền tảng công nghệ cao kết hợp thiết bị IoT và quy trình canh tác sinh học hiện đại. Chúng tôi kết nối người dùng yêu thích nông sản sạch với trang trại thông minh, cho phép bạn thuê phôi nấm, theo dõi toàn bộ chu kỳ sinh trưởng từ xa 24/7 và nhận nông sản tươi ngon tận nhà.',
  mission:
    'Đem đến cho khách hàng trải nghiệm tự trồng nấm minh bạch, tiện lợi và an tâm thông qua sức mạnh của dữ liệu IoT và kỹ thuật viên nông nghiệp tận tâm.',
  highlights: [
    {
      title: 'Giám sát IoT thời gian thực',
      description: 'Cảm biến nhiệt độ, độ ẩm và thông số buồng nuôi được cập nhật liên tục 24/7.',
      icon: 'hardware-chip-outline',
    },
    {
      title: 'Kỹ thuật viên đồng hành',
      description: 'Đội ngũ Farm Operator giàu kinh nghiệm chăm sóc, tưới sương, điều hòa môi trường.',
      icon: 'person-outline',
    },
    {
      title: 'Minh bạch & Đáng tin cậy',
      description: 'Hình ảnh thực tế, nhật ký chăm sóc và báo cáo sinh trưởng rõ ràng trên ứng dụng.',
      icon: 'shield-checkmark-outline',
    },
    {
      title: 'Thu hoạch & Giao tận nơi',
      description: 'Hỗ trợ thu hái đúng độ tuổi và đóng gói, vận chuyển nhanh chóng đến tay khách hàng.',
      icon: 'bicycle-outline',
    },
  ],
  contact: {
    entity: 'SmartMush Farm',
    email: 'Smartmush194@gmail.com',
    phone: '0379896749',
    address: 'Cầu Vồng, Long Bình, TP. Thủ Đức, Hồ Chí Minh, Việt Nam',
  },
};

export const POLICIES_DATA: PolicyItem[] = [
  // 1. Điều khoản sử dụng
  {
    id: 'terms-of-service',
    title: 'Điều khoản sử dụng',
    documentTitle: 'ĐIỀU KHOẢN SỬ DỤNG SMARTMUSH',
    subtitle: 'TERMS OF SERVICE – SMARTMUSH',
    effectiveDate: '13/11/2026',
    badge: 'Pháp lý & Thỏa thuận',
    icon: 'document-text-outline',
    summary:
      'Quy chế nền tảng, quyền và nghĩa vụ của người dùng khi tạo tài khoản, thuê phôi nấm và khai thác dịch vụ SmartMush.',
    content: `# ĐIỀU KHOẢN SỬ DỤNG SMARTMUSH
Ngày cập nhật: 13/11/2026

Chào mừng bạn đến với SmartMush – hệ thống quản lý và giám sát quá trình trồng nấm thông minh. Bằng việc đăng ký tài khoản, truy cập hoặc sử dụng SmartMush, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ các điều khoản sử dụng dưới đây.

1. Giới thiệu về SmartMush
SmartMush là nền tảng hỗ trợ quản lý hoạt động trồng nấm thông minh, kết nối khách hàng với trang trại thông qua hệ thống quản lý tập trung và công nghệ IoT.
Hệ thống cung cấp các chức năng chính:
- Đăng ký và quản lý tài khoản người dùng.
- Tìm hiểu và đăng ký thuê khu vực trồng nấm hoặc phôi nấm.
- Theo dõi quá trình sinh trưởng và phát triển của nấm.
- Giám sát các thông số môi trường như nhiệt độ và độ ẩm thông qua thiết bị IoT.
- Cập nhật hình ảnh, trạng thái và tiến độ mùa vụ trồng nấm.
- Đăng ký yêu cầu thu hoạch, nhận nấm tại trang trại hoặc sử dụng dịch vụ giao hàng.
- Quản lý hoạt động vận hành trang trại và các dịch vụ liên quan.

2. Đăng ký và quản lý tài khoản
- Người dùng cần cung cấp thông tin chính xác, đầy đủ và cập nhật khi đăng ký tài khoản SmartMush.
- Người dùng có trách nhiệm bảo mật thông tin đăng nhập và không chia sẻ tài khoản cho người khác sử dụng trái phép.
- Mỗi tài khoản chỉ được sử dụng bởi chủ tài khoản, trừ trường hợp được hệ thống cho phép.
- Người dùng cần thông báo cho bộ phận quản trị khi phát hiện tài khoản có dấu hiệu bị truy cập hoặc sử dụng trái phép.
- SmartMush có quyền tạm khóa hoặc hạn chế tài khoản nếu phát hiện hành vi vi phạm điều khoản sử dụng hoặc gây ảnh hưởng đến hoạt động của hệ thống.

3. Quy định về dịch vụ thuê trồng nấm
- Khách hàng có thể lựa chọn loại nấm, gói thuê và số lượng phôi hoặc khay trồng theo các dịch vụ được cung cấp trên SmartMush.
- Sau khi xác nhận đăng ký thuê, thông tin đơn thuê sẽ được hệ thống ghi nhận để trang trại tiến hành chuẩn bị khu vực trồng và triển khai mùa vụ.
- Khách hàng có trách nhiệm kiểm tra thông tin đơn thuê trước khi xác nhận, bao gồm loại nấm, số lượng, thời gian dự kiến và các dịch vụ đi kèm.
- Mọi thay đổi hoặc yêu cầu liên quan đến đơn thuê cần được thực hiện thông qua các chức năng được hệ thống hỗ trợ hoặc liên hệ với bộ phận quản lý trang trại.
- Việc hủy đơn, hoàn tiền hoặc thay đổi dịch vụ được thực hiện theo chính sách riêng của SmartMush và thỏa thuận giữa khách hàng với đơn vị vận hành.

4. Theo dõi quá trình trồng nấm
- SmartMush cho phép khách hàng theo dõi tiến độ phát triển của nấm thông qua thông tin mùa vụ, hình ảnh cập nhật và trạng thái từng giai đoạn sinh trưởng.
- Các thông số môi trường như nhiệt độ và độ ẩm được thu thập thông qua hệ thống cảm biến IoT tại khu vực trồng nấm.
- Dữ liệu hiển thị trên ứng dụng có thể phụ thuộc vào tình trạng kết nối Internet, thiết bị IoT và hệ thống máy chủ.
- Thông tin về tiến độ sinh trưởng và thời gian thu hoạch chỉ mang tính dự kiến, có thể thay đổi tùy thuộc vào giống nấm, điều kiện môi trường và tình trạng thực tế của phôi nấm.
- SmartMush không cam kết sản lượng hoặc thời gian thu hoạch tuyệt đối do quá trình sinh trưởng của nấm chịu ảnh hưởng bởi nhiều yếu tố khách quan.

5. Quy định về thu hoạch và giao nhận
- Khi nấm đạt điều kiện thu hoạch, khách hàng có thể gửi yêu cầu thu hoạch thông qua ứng dụng SmartMush.
- Khách hàng có thể lựa chọn nhận nấm trực tiếp tại trang trại hoặc đăng ký dịch vụ giao hàng nếu được hỗ trợ.
- Farm Operator chịu trách nhiệm kiểm tra tình trạng nấm, thực hiện thu hoạch, phân loại và cập nhật thông tin thu hoạch lên hệ thống.
- Đối với đơn hàng giao tận nơi, Shipper có trách nhiệm tiếp nhận đơn được phân công, thực hiện giao hàng và cập nhật trạng thái giao nhận.
- Khách hàng có trách nhiệm cung cấp thông tin nhận hàng chính xác và phối hợp trong quá trình giao nhận.
- Mọi vấn đề phát sinh liên quan đến chất lượng sản phẩm hoặc quá trình giao nhận cần được thông báo cho bộ phận quản lý để kiểm tra và xử lý.

6. Quyền và trách nhiệm của người dùng
Người dùng SmartMush có các quyền và trách nhiệm sau:
- Được sử dụng các chức năng phù hợp với vai trò và quyền hạn của tài khoản.
- Được xem thông tin đơn thuê, mùa vụ và tiến độ trồng nấm của mình.
- Được nhận thông báo về tình trạng mùa vụ và các hoạt động liên quan.
- Cung cấp thông tin chính xác khi sử dụng dịch vụ.
- Không sử dụng hệ thống vào mục đích trái pháp luật.
- Không thực hiện hành vi can thiệp, phá hoại hoặc gây ảnh hưởng đến hoạt động của hệ thống.
- Không truy cập trái phép dữ liệu, tài khoản hoặc chức năng không thuộc quyền hạn của mình.

7. Quyền và trách nhiệm của SmartMush
SmartMush có trách nhiệm:
- Cung cấp và duy trì các chức năng của hệ thống trong phạm vi khả năng vận hành.
- Hỗ trợ người dùng theo dõi thông tin mùa vụ và dữ liệu môi trường được hệ thống ghi nhận.
- Bảo vệ thông tin cá nhân của người dùng theo chính sách bảo mật.
- Thực hiện bảo trì, nâng cấp và sửa lỗi nhằm cải thiện chất lượng dịch vụ.
- Gửi thông báo về các hoạt động liên quan đến tài khoản, đơn thuê và mùa vụ.
- Có quyền điều chỉnh hoặc tạm ngừng một số chức năng để bảo trì, nâng cấp hoặc xử lý sự cố kỹ thuật.

8. Quyền riêng tư và bảo vệ dữ liệu
- SmartMush có thể thu thập các thông tin cần thiết để cung cấp dịch vụ, bao gồm họ tên, email, số điện thoại, địa chỉ giao hàng và thông tin đơn thuê.
- Dữ liệu về quá trình trồng nấm, hình ảnh mùa vụ và thông số môi trường được sử dụng nhằm hỗ trợ quản lý và theo dõi hoạt động canh tác.
- SmartMush không sử dụng hoặc chia sẻ thông tin cá nhân của người dùng cho bên thứ ba ngoài các trường hợp cần thiết để cung cấp dịch vụ, được người dùng đồng ý hoặc pháp luật yêu cầu.
- Người dùng có quyền yêu cầu hỗ trợ cập nhật hoặc xử lý thông tin cá nhân theo quy định của hệ thống và pháp luật hiện hành.

9. Giới hạn trách nhiệm
- SmartMush là nền tảng hỗ trợ quản lý và giám sát hoạt động trồng nấm, không thay thế hoàn toàn việc kiểm tra và đánh giá thực tế tại trang trại.
- SmartMush không chịu trách nhiệm đối với những gián đoạn dịch vụ do sự cố Internet, mất điện, lỗi thiết bị IoT hoặc các yếu tố bất khả kháng nằm ngoài khả năng kiểm soát hợp lý.
- Dữ liệu cảm biến có thể có sai số hoặc bị gián đoạn trong quá trình truyền tải. Người vận hành cần kiểm tra thực tế khi phát hiện thông số bất thường.
- Kết quả sinh trưởng và sản lượng nấm có thể khác với dự kiến do điều kiện sinh học và môi trường.

10. Thay đổi điều khoản sử dụng
- SmartMush có quyền cập nhật hoặc điều chỉnh điều khoản sử dụng để phù hợp với hoạt động của hệ thống và quy định pháp luật.
- Những thay đổi quan trọng sẽ được thông báo đến người dùng thông qua ứng dụng hoặc các kênh liên lạc phù hợp.
- Việc tiếp tục sử dụng SmartMush sau khi điều khoản được cập nhật sẽ được xử lý theo quy định pháp luật và cơ chế thông báo, chấp thuận áp dụng cho từng thay đổi.

11. Chấm dứt sử dụng dịch vụ
- Người dùng có thể ngừng sử dụng SmartMush hoặc yêu cầu hỗ trợ đóng tài khoản theo quy trình của hệ thống.
- SmartMush có quyền tạm ngừng hoặc chấm dứt quyền truy cập của người dùng nếu phát hiện hành vi vi phạm nghiêm trọng điều khoản sử dụng.
- Việc chấm dứt tài khoản không mặc nhiên làm mất đi các nghĩa vụ hoặc quyền lợi còn tồn tại từ những đơn thuê và dịch vụ đã được xác nhận trước đó.

12. Điều khoản chung
- Các điều khoản này được áp dụng đối với tất cả người dùng truy cập và sử dụng nền tảng SmartMush.
- Những vấn đề chưa được quy định trong điều khoản này sẽ được giải quyết dựa trên thỏa thuận giữa các bên và quy định pháp luật Việt Nam hiện hành.
- Nếu có bất kỳ thắc mắc hoặc khiếu nại nào liên quan đến việc sử dụng hệ thống, người dùng có thể liên hệ với bộ phận hỗ trợ của SmartMush thông qua các kênh liên lạc được cung cấp trên ứng dụng.`,
  },

  // 2. Chính sách bảo mật
  {
    id: 'privacy-policy',
    title: 'Chính sách bảo mật',
    documentTitle: 'CHÍNH SÁCH BẢO MẬT',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '13/11/2026',
    badge: 'An toàn dữ liệu',
    icon: 'shield-checkmark-outline',
    summary:
      'Cam kết bảo vệ dữ liệu cá nhân, mã hóa mật khẩu, bảo mật nhật ký IoT và các quyền của người dùng đối với dữ liệu.',
    content: `# CHÍNH SÁCH BẢO MẬT
SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM

Ngày có hiệu lực: 13/11/2026

1. Giới thiệu
SmartMush cam kết tôn trọng và bảo vệ quyền riêng tư của người dùng trong quá trình sử dụng ứng dụng và các dịch vụ liên quan.
Chính sách bảo mật này quy định cách SmartMush thu thập, sử dụng, lưu trữ, xử lý và bảo vệ thông tin cá nhân của người dùng khi truy cập và sử dụng hệ thống.

2. Phạm vi thu thập thông tin
2.1. Thông tin tài khoản cá nhân: Họ và tên, email, số điện thoại, tên đăng nhập, mật khẩu (được băm bảo mật, không lưu văn bản thuần), ảnh đại diện.
2.2. Thông tin đơn thuê và mùa vụ: Loại nấm, số lượng phôi, mã đơn thuê, hình ảnh quá trình sinh trưởng và nhật ký mùa vụ.
2.3. Thông tin giao hàng: Họ tên người nhận, số điện thoại, địa chỉ nhận hàng, trạng thái giao nhận.
2.4. Thông tin giao dịch thanh toán: Mã giao dịch, số tiền, thời gian, phương thức. SmartMush không lưu trữ thông tin thẻ ngân hàng đầy đủ hoặc mã CVV.
2.5. Dữ liệu thiết bị và hoạt động hệ thống: Loại thiết bị, hệ điều hành, địa chỉ IP phiên, thông số nhiệt ẩm từ cảm biến IoT buồng nuôi.

3. Mục đích sử dụng thông tin
- Quản lý tài khoản và hỗ trợ xác thực đăng nhập an toàn.
- Quản lý dịch vụ thuê phôi nấm và cập nhật tiến độ mùa vụ cho khách hàng.
- Giám sát môi trường nuôi trồng qua hệ thống IoT và gửi cảnh báo khi phát hiện thông số bất thường.
- Điều phối thu hoạch và giao hàng chính xác đến tay khách hàng.
- Cải thiện chất lượng hệ thống, nâng cao trải nghiệm ứng dụng.

4. Phạm vi chia sẻ thông tin
SmartMush không bao giờ mua bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ trong phạm vi cần thiết:
- Với Farm Operator: Thông tin mùa vụ để chăm sóc và thu hái.
- Với Shipper: Tên, số điện thoại, địa chỉ để giao hàng thành công.
- Đơn vị công nghệ bên thứ ba: Lưu trữ đám mây, gửi thông báo OTP, cổng thanh toán có cam kết bảo mật.
- Cơ quan nhà nước có thẩm quyền khi có yêu cầu hợp pháp.

5. Lưu trữ và bảo vệ thông tin
- Mật khẩu được mã hóa an toàn bằng thuật toán băm tiêu chuẩn.
- Đường truyền mã hóa HTTPS/TLS.
- Phân quyền nghiêm ngặt theo vai trò (Customer, Farm Operator, Expert, Admin).
- Sao lưu dự phòng định kỳ chống mất mát dữ liệu.

6. Quyền của người dùng đối với thông tin cá nhân
- Quyền được biết và tra cứu thông tin cá nhân đang được lưu trữ.
- Quyền chỉnh sửa thông tin hồ sơ (họ tên, số điện thoại, địa chỉ).
- Quyền yêu cầu xóa thông tin hoặc rút lại sự đồng ý khi ngưng sử dụng dịch vụ.
- Quyền phản ánh, khiếu nại nếu nghi ngờ thông tin bị rò rỉ.

7. Quyền truy cập các chức năng trên thiết bị di động
- Camera / Thư viện ảnh: Để cập nhật ảnh đại diện hoặc kỹ thuật viên chụp ảnh nấm.
- Thông báo (Notifications): Nhận thông báo tiến độ sinh trưởng, báo cáo thu hoạch và mã OTP.
- Vị trí: Hỗ trợ xác định địa chỉ giao hàng khi cần thiết.

8. Bảng thời gian lưu trữ thông tin
- Thông tin tài khoản: Trong suốt thời gian tài khoản hoạt động và theo nghĩa vụ pháp lý.
- Thông tin đơn thuê: Trong thời gian cần thiết để quản lý và giải quyết khiếu nại.
- Lịch sử mùa vụ: Lưu trữ phục vụ tra cứu nông nghiệp sạch.
- Dữ liệu kế toán / giao dịch: Lưu trữ theo quy định pháp luật kế toán tài chính.
- Nhật ký hệ thống: Lưu trữ tối thiểu theo yêu cầu an toàn thông tin mạng.

9. Chuyển dữ liệu xuyên biên giới
Trường hợp sử dụng hạ tầng đám mây quốc tế, dữ liệu được bảo vệ tuân thủ các quy định hiện hành về bảo vệ dữ liệu cá nhân của Việt Nam.

10. Xử lý sự cố và vi phạm bảo mật
Nếu phát hiện dấu hiệu xâm phạm an ninh mạng, SmartMush kích hoạt quy trình ứng phó khẩn cấp, ngăn chặn rò rỉ và thông báo cho người dùng bị ảnh hưởng.

11. Thay đổi chính sách bảo mật
Chính sách có thể được cập nhật định kỳ để phù hợp pháp luật và sẽ thông báo qua ứng dụng.

12. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email: Smartmush194@gmail.com
- Hotline: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, Hồ Chí Minh, Việt Nam`,
  },

  // 3. Chính sách thanh toán
  {
    id: 'payment-policy',
    title: 'Chính sách thanh toán',
    documentTitle: 'CHÍNH SÁCH THANH TOÁN',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '13/11/2026',
    badge: 'Giao dịch an toàn',
    icon: 'card-outline',
    summary:
      'Quy chuẩn thanh toán dịch vụ thuê nấm, hình thức chuyển khoản / quét QR, đối soát minh bạch và xử lý sự cố thanh toán.',
    content: `# CHÍNH SÁCH THANH TOÁN
SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM

Ngày có hiệu lực: 13/11/2026

1. Giới thiệu
Chính sách thanh toán này quy định các điều kiện, phương thức và quy trình thanh toán khi khách hàng sử dụng dịch vụ trên nền tảng SmartMush.
SmartMush cung cấp dịch vụ thuê phôi nấm, khay trồng, theo dõi quá trình sinh trưởng và các dịch vụ thu hoạch, giao hàng.
Chính sách đảm bảo tính minh bạch, an toàn giao dịch và bảo vệ quyền lợi tài chính của khách hàng.

2. Phạm vi áp dụng
Áp dụng đối với các giao dịch thanh toán trên ứng dụng SmartMush:
- Phí thuê phôi nấm và khay nuôi trồng.
- Phí dịch vụ chăm sóc và giám sát IoT.
- Phí thu hoạch và các dịch vụ tiện ích bổ sung.

3. Phương thức thanh toán được hỗ trợ
3.1. Thanh toán trực tuyến:
- Chuyển khoản ngân hàng trực tiếp.
- Quét mã VietQR tiện lợi, chính xác.
- Ví điện tử hoặc cổng thanh toán trực tuyến liên kết (VNPAY, MoMo, v.v.).
3.2. Thanh toán trực tiếp tại trang trại (nếu có đăng ký trước).
3.3. Các phương thức khác được công bố cụ thể trong màn hình thanh toán đơn hàng.

4. Quy trình thanh toán 6 bước
- Bước 1: Lựa chọn giống nấm, số lượng phôi/khay và dịch vụ chăm sóc.
- Bước 2: Kiểm tra bảng chi tiết đơn hàng (loại nấm, số lượng, thời gian, tổng tiền).
- Bước 3: Chọn phương thức thanh toán phù hợp.
- Bước 4: Thực hiện thanh toán theo hướng dẫn (quét QR hoặc chuyển khoản đúng nội dung).
- Bước 5: Hệ thống đối soát tự động và cập nhật trạng thái đơn hàng.
- Bước 6: Trang trại xác nhận đơn thuê và khởi tạo mùa vụ cho khách hàng.

5. Giá dịch vụ và các khoản phí
- Giá dịch vụ được niêm yết rõ ràng, công khai trước khi khách hàng bấm xác nhận thanh toán.
- Đã bao gồm chi phí theo dõi môi trường IoT và nhân công chăm sóc theo gói.
- Khách hàng không phải chi trả bất kỳ khoản phí ẩn nào ngoài các mục đã hiển thị.

6. Xác nhận và quản lý giao dịch
- Mỗi đơn thanh toán có mã giao dịch duy nhất để đối chiếu.
- Lịch sử giao dịch được lưu trữ đầy đủ trong mục "Đơn hàng của tôi".
- Hệ thống chỉ xác nhận thành công khi tiền đã vào tài khoản trang trại qua hệ thống tự động hoặc xác nhận từ kế toán.

7. Xử lý sự cố giao dịch bất thường
- Thanh toán thất bại: Tiền chưa trừ, khách hàng có thể chọn thanh toán lại hoặc chọn phương thức khác.
- Đã trừ tiền nhưng đơn hàng chưa cập nhật: Khách hàng liên hệ Hotline/Email kèm ảnh chụp biên lai giao dịch để kế toán đối soát thủ công và kích hoạt đơn ngay.
- Chuyển khoản nhầm hoặc trùng lặp: Sau khi xác minh số tiền chuyển thừa, SmartMush hoàn tiền theo Chính sách hoàn tiền.

8. Quy định về thanh toán dịch vụ bổ sung
Các dịch vụ phát sinh sau (như đăng ký đóng gói đặc biệt, dịch vụ giao hàng đường dài) được tính phí riêng và thông báo trước khi tiến hành.

9. Trách nhiệm của khách hàng
- Nhập đúng số tiền và nội dung chuyển khoản theo hướng dẫn.
- Bảo mật thông tin tài khoản ngân hàng và mã OTP.
- Lưu trữ chứng từ giao dịch phục vụ việc đối soát khi cần thiết.

10. Trách nhiệm của SmartMush
- Hiển thị bảng giá minh bạch, chính xác.
- Đảm bảo an toàn thông tin giao dịch tài chính.
- Phối hợp xử lý nhanh các trường hợp lỗi mạng hoặc đối soát chậm từ phía cổng thanh toán.

11. Liên kết với chính sách hoàn tiền
Các trường hợp hủy đơn hoặc yêu cầu trả lại tiền được giải quyết tuân thủ theo Chính sách Hủy đơn và Hoàn tiền của SmartMush.

12. Thay đổi chính sách thanh toán
SmartMush có thể điều chỉnh chính sách để phù hợp quy định thanh toán của Ngân hàng Nhà nước và sẽ thông báo trước khi áp dụng.

13. Thông tin liên hệ và hỗ trợ thanh toán
- Đơn vị vận hành: SmartMush Farm
- Hotline kế toán / hỗ trợ: 0379896749
- Email: Smartmush194@gmail.com
- Địa chỉ: Cầu Vồng, Long Bình, Hồ Chí Minh, Việt Nam`,
  },

  // 4. Chính sách hoàn tiền
  {
    id: 'refund-policy',
    title: 'Chính sách hoàn tiền',
    documentTitle: 'CHÍNH SÁCH HOÀN TIỀN',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '13/11/2026',
    badge: 'Tài chính & Hoàn phí',
    icon: 'cash-outline',
    summary:
      'Quy định điều kiện, trường hợp, nguyên tắc xác định số tiền hoàn và quy trình giải quyết hoàn tiền minh bạch cho khách hàng.',
    content: `# CHÍNH SÁCH HOÀN TIỀN
SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM

Ngày có hiệu lực: 13/11/2026

1. Giới thiệu
Chính sách hoàn tiền này quy định các điều kiện, trường hợp và quy trình xử lý yêu cầu hoàn tiền khi khách hàng sử dụng dịch vụ trên nền tảng SmartMush.
SmartMush cung cấp dịch vụ hỗ trợ thuê phôi nấm, khay trồng hoặc khu vực trồng nấm, theo dõi quá trình sinh trưởng, quản lý mùa vụ và đăng ký các dịch vụ thu hoạch, giao nhận.
Chính sách được xây dựng nhằm đảm bảo quyền lợi của khách hàng, đồng thời tạo cơ sở minh bạch để đơn vị vận hành tiếp nhận và xử lý các yêu cầu hoàn tiền phát sinh trong quá trình cung cấp dịch vụ.
Việc hoàn tiền được xem xét dựa trên trạng thái đơn hàng, tiến độ thực hiện dịch vụ, nguyên nhân phát sinh và các thỏa thuận giữa khách hàng với đơn vị vận hành.

2. Phạm vi áp dụng
Chính sách hoàn tiền áp dụng đối với các khoản thanh toán phát sinh trên SmartMush, bao gồm:
- Phí thuê phôi nấm.
- Phí thuê khay hoặc khu vực trồng nấm.
- Phí dịch vụ chăm sóc và quản lý mùa vụ.
- Phí thu hoạch (nếu có).
- Các khoản phí dịch vụ bổ sung khác.
Chính sách áp dụng cho khách hàng đã thực hiện thanh toán và có nhu cầu yêu cầu hoàn lại toàn bộ số tiền đã thanh toán.

3. Các trường hợp được xem xét hoàn tiền
SmartMush tiếp nhận và xem xét yêu cầu hoàn tiền trong các trường hợp sau:

3.1. Đơn thuê chưa được xác nhận hoặc chưa triển khai
Khách hàng có thể được xem xét hoàn tiền khi:
- Đơn thuê đã thanh toán nhưng chưa được xác nhận bởi đơn vị vận hành.
- Trang trại không thể tiếp nhận hoặc cung cấp dịch vụ theo đơn thuê.
- Dịch vụ không thể triển khai do nguyên nhân thuộc trách nhiệm của đơn vị vận hành.
Việc hoàn tiền được thực hiện sau khi xác minh tình trạng đơn hàng và khoản thanh toán.

3.2. Đơn thuê bị hủy bởi đơn vị vận hành
Khách hàng có thể được hoàn tiền nếu SmartMush hoặc trang trại không thể tiếp tục cung cấp dịch vụ vì các lý do thuộc trách nhiệm của đơn vị vận hành.
Các trường hợp có thể bao gồm:
- Không đủ phôi hoặc khay trồng để thực hiện đơn thuê.
- Không thể bố trí khu vực trồng nấm như đã xác nhận.
- Trang trại không thể tiếp tục cung cấp dịch vụ theo thỏa thuận.
- Các vấn đề vận hành nghiêm trọng khiến dịch vụ không thể được thực hiện.
Mức hoàn tiền được xác định dựa trên phần dịch vụ chưa được cung cấp và các chi phí hợp lệ đã phát sinh.

3.3. Thanh toán trùng lặp hoặc thanh toán sai
Khách hàng được xem xét hoàn tiền khi:
- Thanh toán nhiều lần cho cùng một đơn hàng.
- Hệ thống ghi nhận khoản thanh toán không tương ứng với đơn hàng.
- Khách hàng thanh toán vượt quá số tiền phải trả.
- Giao dịch phát sinh sai lệch được xác minh là lỗi từ hệ thống hoặc quá trình xử lý thanh toán.
Đối với trường hợp thanh toán trùng lặp hoặc thanh toán thừa, SmartMush sẽ đối chiếu giao dịch và hoàn lại khoản tiền thanh toán dư hợp lệ.

3.4. Mùa vụ gặp sự cố nghiêm trọng
Trong quá trình trồng nấm, nếu xảy ra sự cố nghiêm trọng khiến mùa vụ không thể tiếp tục hoặc dịch vụ không đạt được mục đích đã thỏa thuận, khách hàng có quyền gửi yêu cầu để SmartMush xem xét phương án xử lý.
Các trường hợp có thể bao gồm:
- Phôi nấm bị hư hỏng nghiêm trọng.
- Điều kiện môi trường không được duy trì trong thời gian ảnh hưởng đáng kể đến mùa vụ.
- Thiết bị hoặc hệ thống vận hành gặp sự cố kéo dài làm ảnh hưởng đến quá trình chăm sóc.
- Trang trại không thể tiếp tục chăm sóc hoặc duy trì mùa vụ.
Farm Operator và bộ phận quản lý có trách nhiệm kiểm tra tình trạng thực tế, lịch sử chăm sóc và dữ liệu môi trường liên quan để xác định nguyên nhân.
Tùy theo mức độ ảnh hưởng và trách nhiệm của các bên, SmartMush có thể xem xét:
- Hoàn tiền toàn bộ đối với phần dịch vụ chưa được thực hiện.
- Hoàn tiền một phần tương ứng với phần dịch vụ bị ảnh hưởng.
- Hỗ trợ thay thế phôi hoặc khay trồng.
- Bố trí mùa vụ mới nếu khách hàng đồng ý.
Việc lựa chọn phương án xử lý cần được thông báo và thống nhất với khách hàng.

3.5. Dịch vụ bổ sung không được cung cấp
Khách hàng có thể được hoàn tiền đối với các dịch vụ bổ sung đã thanh toán nhưng không được thực hiện theo thỏa thuận.
Ví dụ:
- Đã thanh toán phí thu hoạch nhưng dịch vụ thu hoạch không được cung cấp.
- Đã thanh toán phí giao hàng nhưng đơn vị vận hành không thực hiện giao hàng.
- Dịch vụ đóng gói đã thanh toán nhưng không được cung cấp.
Mức hoàn tiền được xác định theo giá trị dịch vụ chưa được thực hiện.

4. Các trường hợp không được hoàn tiền
SmartMush có thể từ chối yêu cầu hoàn tiền trong những trường hợp sau, nếu việc từ chối phù hợp với thỏa thuận và quy định pháp luật:
- Khách hàng thay đổi quyết định sau khi dịch vụ đã được triển khai và các chi phí hợp lệ đã phát sinh.
- Khách hàng cung cấp thông tin không chính xác dẫn đến việc không thể thực hiện dịch vụ.
- Khách hàng không phối hợp nhận sản phẩm hoặc không tiếp nhận giao hàng theo thỏa thuận mà không có lý do hợp lệ.
- Sản lượng hoặc thời gian thu hoạch thực tế khác với dự kiến do đặc tính sinh học tự nhiên của nấm, trong khi trang trại đã thực hiện đúng trách nhiệm chăm sóc và thỏa thuận.
- Yêu cầu hoàn tiền không có căn cứ xác thực hoặc có dấu hiệu gian lận.
Lưu ý: Việc một dịch vụ đã bắt đầu hoặc khách hàng thay đổi ý định không mặc nhiên làm mất quyền yêu cầu hoàn tiền trong trường hợp pháp luật có quy định khác hoặc đơn vị vận hành không thực hiện đúng nghĩa vụ.

5. Nguyên tắc xác định số tiền hoàn
Số tiền hoàn được xác định dựa trên:
- Tổng số tiền khách hàng đã thanh toán.
- Phần dịch vụ đã được thực hiện.
- Phần dịch vụ chưa được cung cấp.
- Các chi phí hợp lệ đã phát sinh.
- Nguyên nhân dẫn đến yêu cầu hoàn tiền.
- Trách nhiệm của khách hàng và đơn vị vận hành.
- Các thỏa thuận đã xác nhận giữa các bên.

5.1. Hoàn tiền toàn bộ
Áp dụng khi giao dịch không thể thực hiện hoặc dịch vụ không được cung cấp do nguyên nhân thuộc trách nhiệm của đơn vị vận hành, không có phần dịch vụ hợp lệ đã được cung cấp cần khấu trừ.

5.2. Hoàn tiền một phần
Áp dụng khi một phần dịch vụ đã được cung cấp nhưng phần còn lại không thể thực hiện hoặc không đáp ứng thỏa thuận.
Số tiền hoàn được xác định tương ứng với giá trị phần dịch vụ chưa được cung cấp hoặc phần thiệt hại thuộc trách nhiệm của đơn vị vận hành.

5.3. Hoàn tiền do thanh toán thừa
Đối với giao dịch thanh toán trùng lặp hoặc thanh toán vượt số tiền phải trả, khoản tiền thừa hợp lệ sẽ được hoàn lại sau khi xác minh.

6. Quy trình yêu cầu hoàn tiền
Khách hàng có thể gửi yêu cầu hoàn tiền thông qua chức năng hỗ trợ trên ứng dụng SmartMush hoặc liên hệ trực tiếp với bộ phận quản lý.
Quy trình xử lý gồm các bước:
- Bước 1: Gửi yêu cầu hoàn tiền (mã đơn thuê, họ tên, lý do, số tiền đề nghị, chứng từ/hình ảnh nếu có).
- Bước 2: Tiếp nhận yêu cầu bởi hệ thống và chuyển bộ phận quản lý.
- Bước 3: Xác minh thông tin (thanh toán, trạng thái mùa vụ, nhật ký IoT, thu hoạch, giao nhận).
- Bước 4: Đưa ra kết quả xử lý (chấp thuận/từ chối, lý do, số tiền, phương thức, thời gian).
- Bước 5: Thực hiện hoàn tiền theo phương thức phù hợp.
- Bước 6: Cập nhật trạng thái trên hệ thống (Pending, Under Review, Approved, Processing, Refunded, Rejected).

7. Thời gian xử lý hoàn tiền
7.1. SmartMush tiếp nhận và kiểm tra yêu cầu hoàn tiền trong thời gian hợp lý kể từ khi nhận đủ thông tin.
7.2. Thời gian xác minh phụ thuộc vào mức độ phức tạp của từng trường hợp.
7.3. Sau khi được duyệt, thời gian hoàn tiền phụ thuộc vào phương thức thanh toán và ngân hàng/cổng thanh toán.
7.4. Nếu phát sinh chậm trễ, SmartMush sẽ chủ động thông báo cho khách hàng.

8. Phương thức hoàn tiền
Ưu tiên hoàn tiền thông qua phương thức thanh toán ban đầu (tài khoản ngân hàng, ví điện tử).
Nếu không thể hoàn qua phương thức cũ, SmartMush sẽ liên hệ để thống nhất phương án thay thế.
Lưu ý: SmartMush không bao giờ yêu cầu khách hàng cung cấp mật khẩu, mã OTP hoặc thông tin xác thực bí mật để hoàn tiền.

9. Trách nhiệm của khách hàng
- Cung cấp thông tin chính xác, trung thực.
- Cung cấp mã đơn và chứng từ thanh toán khi cần.
- Phối hợp xác minh và cung cấp tài khoản thụ hưởng chính xác.
- Không gian lận hoặc trục lợi chính sách.

10. Trách nhiệm của SmartMush
- Xử lý minh bạch, bảo vệ quyền lợi hợp pháp của khách hàng.
- Kiểm tra kỹ lưỡng trước khi ra quyết định và thông báo rõ lý do.
- Hoàn trả đúng số tiền được duyệt và bảo mật thông tin cá nhân.

11. Khiếu nại về kết quả hoàn tiền
Khách hàng có quyền gửi yêu cầu khiếu nại nếu chưa đồng ý với kết quả xử lý để được xem xét lại.

12. Thay đổi chính sách hoàn tiền
SmartMush có quyền cập nhật chính sách và sẽ thông báo qua ứng dụng hoặc các kênh liên lạc chính thức.

13. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email hỗ trợ: Smartmush194@gmail.com
- Số điện thoại: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, Hồ Chí Minh, Việt Nam`,
  },

  // 5. Chính sách thuê trồng và chăm sóc nấm
  {
    id: 'cultivation-policy',
    title: 'Chính sách thuê trồng và chăm sóc nấm',
    documentTitle: 'CHÍNH SÁCH THUÊ TRỒNG VÀ CHĂM SÓC NẤM',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '13/11/2026',
    badge: 'Canh tác & Dịch vụ',
    icon: 'leaf-outline',
    summary:
      'Quy định chi tiết các giai đoạn nuôi trồng, trách nhiệm của kỹ thuật viên Farm Operator, cơ chế giám sát IoT và quyền lợi của người thuê.',
    content: `# CHÍNH SÁCH THUÊ TRỒNG VÀ CHĂM SÓC NẤM
SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM

Ngày có hiệu lực: 13/11/2026

1. Giới thiệu
Chính sách thuê trồng và chăm sóc nấm quy định các điều kiện, quyền lợi và trách nhiệm của khách hàng cũng như đơn vị vận hành trong quá trình sử dụng dịch vụ trồng nấm trên nền tảng SmartMush.
SmartMush cung cấp nền tảng hỗ trợ khách hàng đăng ký thuê phôi nấm, khay trồng hoặc khu vực trồng nấm tại trang trại. Khách hàng có thể theo dõi quá trình sinh trưởng của nấm thông qua thông tin mùa vụ, hình ảnh cập nhật và các thông số môi trường được thu thập từ hệ thống IoT.
Farm Operator chịu trách nhiệm chuẩn bị khu vực trồng, chăm sóc, giám sát điều kiện môi trường, cập nhật tiến độ sinh trưởng và thực hiện các hoạt động thu hoạch theo quy trình vận hành của trang trại.

2. Phạm vi dịch vụ
SmartMush hỗ trợ:
- Dịch vụ thuê phôi nấm, khay trồng hoặc khu vực trồng nấm.
- Chuẩn bị và bố trí phôi tại khu vực trồng đạt chuẩn vệ sinh.
- Chăm sóc, tưới sương, thông gió và theo dõi sinh trưởng.
- Giám sát điều kiện môi trường qua cảm biến IoT (nhiệt độ, độ ẩm).
- Cập nhật hình ảnh thực tế và tiến độ mùa vụ.
- Thu hoạch và bàn giao sản phẩm nấm thành phẩm.

3. Quy định về đăng ký thuê trồng nấm
3.1. Lựa chọn dịch vụ: Khách hàng chọn loại nấm, số lượng phôi/khay và gói dịch vụ hiển thị trên ứng dụng.
3.2. Xác nhận đơn thuê: Kiểm tra chi phí, thời gian sinh trưởng dự kiến trước khi xác nhận.
3.3. Chuẩn bị mùa vụ: Nhân viên kiểm tra phôi, khử khuẩn buồng nuôi, bố trí khay và kết nối cảm biến IoT.
3.4. Thay đổi thông tin: Gửi yêu cầu qua bộ phận hỗ trợ trước khi mùa vụ bắt đầu triển khai.

4. Quy định về chăm sóc và vận hành mùa vụ
4.1. Trách nhiệm của Farm Operator: Trực tiếp chăm sóc, kiểm tra tơ nấm, mầm nấm, điều chỉnh nhiệt ẩm, ghi nhật ký và chụp ảnh định kỳ.
4.2. Giám sát môi trường qua IoT: Cảm biến tự động đo nhiệt độ, độ ẩm buồng trồng. Khi có thông số vượt ngưỡng, hệ thống cảnh báo tức thì cho kỹ thuật viên.
4.3. Điều chỉnh thiết bị: Vận hành hệ thống phun sương, quạt gió, đèn chiếu sáng phù hợp theo từng loại nấm.
4.4. Ghi nhận hoạt động: Mọi tác vụ chăm sóc và xử lý sự cố đều được lưu vết trên hệ thống.

5. Quy định về theo dõi tiến độ mùa vụ
Khách hàng có thể tra cứu mã mùa vụ, ngày bắt đầu, giai đoạn phát triển, biểu đồ nhiệt ẩm IoT và ảnh chụp nấm theo từng chu kỳ. Dữ liệu mang tính hỗ trợ theo dõi minh bạch.

6. Quy định về các giai đoạn sinh trưởng
- Giai đoạn 1: Chuẩn bị phôi (kiểm tra độ ẩm phôi, bố trí vị trí).
- Giai đoạn 2: Phát triển tơ nấm (nuôi sợi tơ ăn kín giá thể).
- Giai đoạn 3: Hình thành và phát triển quả thể (ra mầm nấm và phát triển tán nấm).
- Giai đoạn 4: Thu hoạch (thu hái đúng kích thước tiêu chuẩn, cân đo khối lượng).

7. Thời gian sinh trưởng và thu hoạch
Thời gian sinh trưởng phụ thuộc vào chủng loại nấm và đặc tính sinh học tự nhiên. Thời gian hiển thị trên ứng dụng là thời gian dự kiến tham khảo; thời điểm thu hoạch thực tế do Farm Operator kiểm tra và xác nhận.

8. Quy định về sự cố trong quá trình trồng nấm
Khi xảy ra sự cố (hư hỏng phôi, lỗi thiết bị, dịch bệnh, mất điện), Farm Operator xử lý ngay và thông báo cho khách hàng phương án xử lý:
- Chăm sóc khắc phục theo tư vấn chuyên gia.
- Thay thế phôi hoặc bố trí khay trồng mới.
- Bố trí mùa vụ mới hoặc xem xét hoàn tiền theo chính sách hoàn tiền.

9. Quyền và trách nhiệm của khách hàng
- Quyền: Được cập nhật tiến độ, ảnh chụp, thông số IoT, gửi yêu cầu hỗ trợ và đăng ký nhận thành phẩm nấm.
- Trách nhiệm: Cung cấp thông tin chính xác, thanh toán đầy đủ, không tự ý can thiệp vào trang trại hoặc thiết bị IoT khi chưa được phép.

10. Trách nhiệm của đơn vị vận hành SmartMush
- Chuẩn bị đầy đủ phôi và điều kiện canh tác đạt chuẩn.
- Đảm bảo kỹ thuật viên chăm sóc đều đặn và cập nhật trung thực.
- Duy trì thiết bị IoT vận hành ổn định.

11. Giới hạn trách nhiệm
Nấm là sinh vật sống chịu tác động của môi trường và đặc tính sinh học. SmartMush không cam kết tuyệt đối về sản lượng hay ngày thu hoạch chính xác nếu không có thỏa thuận cụ thể, nhưng cam kết thực hiện đầy đủ quy trình kỹ thuật.

12. Thay đổi chính sách
Chính sách có thể được cập nhật và thông báo công khai trên ứng dụng.

13. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email: Smartmush194@gmail.com
- Hotline: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, Hồ Chí Minh, Việt Nam`,
  },

  // 6. Chính sách thu hoạch và giao nhận
  {
    id: 'harvest-delivery-policy',
    title: 'Chính sách thu hoạch và giao nhận',
    documentTitle: 'CHÍNH SÁCH THU HOẠCH VÀ GIAO NHẬN',
    subtitle: 'HARVEST & DELIVERY POLICY – SMARTMUSH',
    effectiveDate: '13/11/2026',
    badge: 'Hậu cần & Vận chuyển',
    icon: 'car-outline',
    summary:
      'Quy chuẩn thu hái, phân loại chất lượng nấm, các hình thức nhận nấm tại trang trại hoặc giao hàng tận nơi qua đơn vị vận chuyển.',
    content: `# CHÍNH SÁCH THU HOẠCH VÀ GIAO NHẬN
HARVEST & DELIVERY POLICY – SMARTMUSH

Ngày hiệu lực: 13/11/2026

1. Giới thiệu
Chính sách Thu hoạch và Giao nhận quy định các nguyên tắc, quy trình và trách nhiệm liên quan đến việc thu hoạch, phân loại, đóng gói và bàn giao nấm cho khách hàng sử dụng dịch vụ của SmartMush.
Khách hàng có thể lựa chọn nhận nấm trực tiếp tại trang trại hoặc sử dụng dịch vụ giao hàng thông qua đối tác vận chuyển thứ ba (Grab hoặc tương đương).

2. Phạm vi áp dụng
Áp dụng đối với Customer, Farm Operator, Shipper/đối tác vận chuyển và Administrator phụ trách điều phối.

3. Điều kiện và yêu cầu thu hoạch
3.1. Nấm được thu hoạch khi đạt kích thước và độ chín sinh học phù hợp.
3.2. Farm Operator theo dõi, kiểm tra thực tế và cập nhật trạng thái sẵn sàng thu hoạch lên ứng dụng.
3.3. Khách hàng gửi yêu cầu thu hoạch qua ứng dụng, chọn hình thức nhận hàng (tại nông trại hoặc giao tận nơi), thời gian và địa chỉ.
3.4. Thời gian thu hoạch có thể điều chỉnh để đảm bảo độ tươi ngon tốt nhất của nấm.

4. Quy trình thu hoạch và phân loại
4.1. Farm Operator tiếp nhận yêu cầu và kiểm tra buồng nuôi.
4.2. Tiến hành hái nấm theo đúng kỹ thuật không làm dập nát mũ nấm.
4.3. Phân loại theo tiêu chuẩn độ tươi, kích thước đồng đều và loại bỏ tạp chất/phôi hỏng.
4.4. Cân khối lượng thực tế và cập nhật ngay lên ứng dụng cho khách hàng nắm rõ.

5. Hình thức nhận hàng
5.1. Nhận trực tiếp tại trang trại:
- Khách hàng hẹn giờ đến lấy.
- Kỹ thuật viên đóng gói bảo quản mát sẵn sàng.
- Khách hàng kiểm tra nấm tại chỗ và ký nhận.
5.2. Giao hàng qua đơn vị vận chuyển thứ ba:
- Khách hàng cung cấp địa chỉ nhận và số điện thoại người nhận.
- Đóng gói cẩn thận chống sốc và dán mã đơn hàng.
- Bàn giao cho tài xế và cung cấp mã vận đơn để khách hàng theo dõi hành trình.

6. Quy định về đóng gói và bàn giao
- Đóng gói bằng bao bì thoáng khí chuyên dụng cho nấm tươi hoặc hộp giữ nhiệt tùy khoảng cách.
- Dán nhãn thông tin loại nấm, khối lượng tịnh, ngày giờ hái.
- Bàn giao đúng mã đơn, tránh nhầm lẫn.

7. Phí thu hoạch và giao hàng
- Phí thu hoạch được áp dụng theo gói thuê đã thống nhất.
- Chi phí vận chuyển tính theo cước phí của bên thứ ba dựa trên khoảng cách và thời điểm đặt chuyến. Khách hàng kiểm tra phí dự kiến trước khi xác nhận đơn giao.

8. Trách nhiệm của các bên
- Customer: Cung cấp địa chỉ chuẩn xác, nhận hàng đúng giờ và kiểm tra chất lượng nấm khi nhận.
- Farm Operator: Hái chuẩn kỹ thuật, phân loại chính xác, đóng gói cẩn thận và cập nhật hệ thống.
- Third-party Delivery: Giao nhanh chóng, bảo quản tránh dập nát, cập nhật trạng thái đơn giao.
- Administrator: Điều phối và hỗ trợ xử lý khiếu nại phát sinh.

9. Bảng trạng thái thu hoạch và giao nhận
- Harvest Requested: Khách hàng đã gửi yêu cầu thu hoạch.
- Harvest Confirmed: Yêu cầu thu hoạch đã được xác nhận.
- Harvesting: Farm Operator đang tiến hành thu hoạch.
- Harvest Completed: Đã hoàn tất thu hoạch và cân đo.
- Preparing for Delivery: Sản phẩm đang được đóng gói.
- Waiting for Pickup: Đang chờ tài xế đến nhận hàng.
- Picked Up: Tài xế đã nhận sản phẩm từ trang trại.
- Delivering: Đơn hàng đang trên đường vận chuyển.
- Delivered: Sản phẩm đã giao thành công đến khách hàng.
- Delivery Failed: Giao hàng không thành công (không liên lạc được người nhận, v.v.).
- Completed: Hoàn tất quy trình đơn thu hoạch và giao nhận.
- Cancelled: Yêu cầu đã bị hủy.

10. Xử lý sự cố giao nhận
- Nếu không có tài xế nhận chuyến hoặc tài xế trễ: hỗ trợ điều phối lại hoặc đổi khung giờ.
- Hàng giao bị hư hại do vận chuyển: Khách hàng chụp ảnh lúc nhận và thông báo cho SmartMush trong vòng 2 giờ để phối hợp đơn vị vận chuyển đền bù hoặc gửi đợt nấm mới thay thế.

11. Chính sách khiếu nại
Khách hàng có quyền khiếu nại về khối lượng, mẫu mã nấm hoặc thời gian giao nhận để được hỗ trợ kiểm tra và bù hoàn thỏa đáng.

12. Giới hạn trách nhiệm
SmartMush chịu trách nhiệm chất lượng nấm tại thời điểm hái và bàn giao; đối với khâu vận chuyển của bên thứ ba, SmartMush phối hợp hỗ trợ tối đa nhưng theo chính sách của hãng vận tải.

13. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Hotline: 0379896749
- Email: Smartmush194@gmail.com
- Địa chỉ: Cầu Vồng, Long Bình, Hồ Chí Minh`,
  },

  // 7. Chính sách khiếu nại và giải quyết tranh chấp
  {
    id: 'complaint-dispute-policy',
    title: 'Chính sách khiếu nại và giải quyết tranh chấp',
    documentTitle: 'CHÍNH SÁCH KHIẾU NẠI VÀ GIẢI QUYẾT TRANH CHẤP',
    subtitle: 'COMPLAINT & DISPUTE RESOLUTION POLICY – SMARTMUSH',
    effectiveDate: '13/11/2026',
    badge: 'Khiếu nại & Hỗ trợ',
    icon: 'alert-circle-outline',
    summary:
      'Quy trình tiếp nhận, thời hạn xác minh và giải quyết tranh chấp công bằng, bảo vệ quyền lợi hợp pháp của người tiêu dùng.',
    content: `# CHÍNH SÁCH KHIẾU NẠI VÀ GIẢI QUYẾT TRANH CHẤP
COMPLAINT & DISPUTE RESOLUTION POLICY – SMARTMUSH

Ngày hiệu lực: 13/11/2026

1. Giới thiệu
Chính sách Khiếu nại và Giải quyết Tranh chấp quy định quy trình tiếp nhận, xác minh và xử lý các phản ánh, khiếu nại hoặc tranh chấp phát sinh trong quá trình khách hàng sử dụng dịch vụ của SmartMush.
Mục tiêu là xử lý minh bạch, khách quan, nhanh chóng và bảo vệ quyền lợi hợp pháp của các bên.

2. Phạm vi áp dụng
Áp dụng cho Customer, Farm Operator, Shipper, Quản trị viên Administrator và đơn vị vận hành SmartMush.

3. Các trường hợp được tiếp nhận khiếu nại
- Khiếu nại dịch vụ thuê trồng: Sai số lượng phôi, sai giống nấm, buồng nuôi không đạt cam kết.
- Khiếu nại quá trình chăm sóc: Sai lệch nhiệt ẩm kéo dài, cảm biến IoT mất kết nối không khắc phục, phôi nhiễm bệnh.
- Khiếu nại thu hoạch: Khối lượng thực tế chênh lệch bất thường, nấm không đạt chuẩn độ tươi.
- Khiếu nại thanh toán: Trừ tiền sai, trừ trùng lặp, chậm hoàn tiền.
- Khiếu nại giao nhận: Nấm dập nát, giao sai địa chỉ, trễ hẹn nghiêm trọng.

4. Kênh tiếp nhận khiếu nại
- Gửi khiếu nại trực tiếp trên ứng dụng SmartMush (mục Hồ sơ > Hỗ trợ/Khiếu nại).
- Email: Smartmush194@gmail.com
- Hotline hỗ trợ: 0379896749
- Trực tiếp tại văn phòng trang trại: Cầu Vồng, Long Bình, TP. Thủ Đức, Hồ Chí Minh.
Khách hàng vui lòng cung cấp mã mùa vụ/mã đơn hàng, ảnh chụp hoặc biên lai liên quan.

5. Quy trình giải quyết 6 bước
- Bước 1: Tiếp nhận khiếu nại và tạo mã hồ sơ theo dõi (trạng thái Pending).
- Bước 2: Kiểm tra và phân loại nhóm vấn đề (kỹ thuật canh tác, IoT, thanh toán, giao vận).
- Bước 3: Xác minh thông tin (đối soát lịch sử IoT, camera buồng trồng, nhật ký kỹ thuật viên).
- Bước 4: Đề xuất phương án khắc phục (bù mùa vụ mới, hỗ trợ kỹ thuật, đổi trả, hoàn tiền).
- Bước 5: Thông báo phương án xử lý và thống nhất với khách hàng.
- Bước 6: Hoàn tất hồ sơ và lưu trữ nhật ký xử lý (trạng thái Resolved/Closed).

6. Thời gian xử lý dự kiến
- Xác nhận tiếp nhận: Trong vòng 24 giờ làm việc.
- Kiểm tra & phân loại: 1 - 2 ngày làm việc.
- Xác minh thông tin chi tiết: 2 - 5 ngày làm việc.
- Thực hiện phương án: Theo thỏa thuận cụ thể của từng trường hợp.

7. Trách nhiệm của các bên
- Khách hàng: Cung cấp bằng chứng trung thực, phối hợp trao đổi văn minh.
- Kỹ thuật viên & Quản trị viên: Cung cấp dữ liệu nhật ký canh tác, giải trình minh bạch và khắc phục kịp thời.
- Đơn vị vận chuyển: Cung cấp bằng chứng giao nhận và phối hợp bồi thường tổn thất nếu do lỗi vận chuyển.

8. Bảng trạng thái khiếu nại trên hệ thống
- Pending: Khiếu nại mới gửi, chờ tiếp nhận.
- Under Review: Đang kiểm tra và xác minh dữ liệu.
- Waiting for Information: Chờ khách hàng hoặc bên liên quan bổ sung tài liệu.
- In Progress: Đang tiến hành xử lý khắc phục.
- Awaiting Third Party: Đang chờ phản hồi đối soát từ ngân hàng/đối tác giao vận.
- Resolved: Đã xử lý xong và thống nhất phương án với khách hàng.
- Rejected: Khiếu nại không đủ căn cứ và có thông báo lý do rõ ràng.
- Closed: Hồ sơ giải quyết đã kết thúc.

9. Phương thức giải quyết tranh chấp
Ưu tiên giải quyết thông qua thương lượng thiện chí giữa hai bên. Trường hợp không đạt được thỏa thuận, tranh chấp sẽ được đưa ra cơ quan tài phán có thẩm quyền theo quy định của pháp luật Việt Nam.

10. Bảo mật thông tin khiếu nại
Thông tin khiếu nại và chứng từ cá nhân được lưu trữ bảo mật tuyệt đối, chỉ dùng cho mục đích xác minh và giải quyết vụ việc.

11. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email: Smartmush194@gmail.com
- Hotline: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, Hồ Chí Minh`,
  },
];
