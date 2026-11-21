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
    effectiveDate: '21/11/2026',
    badge: 'Pháp lý & Thỏa thuận',
    icon: 'document-text-outline',
    summary:
      'Quy định điều kiện sử dụng tài khoản, dịch vụ thuê trồng, thanh toán, thu hoạch, giao nhận, quyền và nghĩa vụ các bên.',
    content: `# ĐIỀU KHOẢN SỬ DỤNG SMARTMUSH
Cập nhật lần cuối: 21/11/2026
Ngày có hiệu lực: 21/11/2026

SmartMush là hệ thống hỗ trợ đăng ký dịch vụ thuê trồng, chăm sóc nấm, theo dõi mùa vụ, thu hoạch và giao nhận. Điều khoản này quy định quyền, nghĩa vụ và trách nhiệm giữa khách hàng và SmartMush.

Khi đăng ký tài khoản hoặc sử dụng dịch vụ, khách hàng xác nhận đã đọc, hiểu và đồng ý tuân thủ điều khoản này cùng các chính sách có liên quan.

1. Điều kiện đăng ký và tài khoản
1.1. Đăng ký
- Khách hàng cung cấp thông tin chính xác, đầy đủ và sử dụng thông tin liên lạc hợp lệ.
- Người đăng ký cần có năng lực hành vi dân sự theo pháp luật hoặc được người đại diện hợp pháp hỗ trợ khi cần.
- Khách hàng chịu trách nhiệm về tính chính xác của thông tin đã cung cấp.

1.2. Bảo mật tài khoản
- Khách hàng bảo mật thông tin đăng nhập và không chia sẻ cho người không được phép sử dụng.
- Khách hàng thông báo khi phát hiện dấu hiệu truy cập trái phép.
- SmartMush không yêu cầu mật khẩu qua kênh liên lạc không chính thức.
- Hoạt động qua tài khoản được dùng để xác minh trừ khi có căn cứ tài khoản bị truy cập trái phép.

1.3. Quản lý tài khoản
SmartMush có thể yêu cầu xác minh hoặc hạn chế chức năng khi có dấu hiệu bất thường, vi phạm điều khoản hoặc nguy cơ an toàn. Mọi hạn chế phải có căn cứ phù hợp.

2. Dịch vụ thuê trồng và chăm sóc
2.1. Đăng ký
Khách hàng lựa chọn loại nấm, số lượng phôi/khay và dịch vụ đi kèm. Hệ thống tự chọn gói thuê theo thời gian sinh trưởng dự kiến của loại nấm và hiển thị gói cùng chi phí để khách hàng kiểm tra trước khi xác nhận.

Đơn được ghi nhận sau khi hoàn tất xác nhận và thanh toán theo quy trình. Việc triển khai phụ thuộc tài nguyên, khu vực trồng và khả năng cung cấp tại thời điểm xác nhận.

2.2. Chăm sóc
- SmartMush tổ chức chăm sóc theo quy trình phù hợp với loại nấm.
- Farm Operator theo dõi, kiểm tra và cập nhật tình trạng sinh trưởng.
- Hệ thống IoT hỗ trợ giám sát nhiệt độ, độ ẩm và vận hành theo cấu hình thực tế.
- Khách hàng theo dõi các dữ liệu được hệ thống ghi nhận.
- Khách hàng không tự ý can thiệp khu vực trồng, thiết bị hoặc vận hành khi chưa được phép.

2.3. Thời gian và sản lượng
Thời gian và sản lượng chỉ mang tính dự kiến, phụ thuộc điều kiện môi trường, giống nấm và quá trình sinh trưởng. SmartMush chỉ cam kết sản lượng khi được nêu cụ thể trong gói/thỏa thuận. IoT không bảo đảm môi trường luôn ổn định hoặc loại bỏ toàn bộ rủi ro.

3. Thanh toán
- Khách hàng thanh toán đầy đủ theo đơn và phương thức được hỗ trợ.
- Giá, phí giao nhận và phụ phí được hiển thị/thông báo trước xác nhận.
- Giao dịch chỉ thành công khi SmartMush hoặc đơn vị thanh toán xác nhận hợp lệ.
- Không thanh toán lặp khi giao dịch trước đang xử lý.
- Vấn đề thanh toán và hoàn tiền xử lý theo Chính sách thanh toán và Chính sách hoàn hàng, hoàn tiền.

4. Thu hoạch và giao nhận
- Farm Operator xác định thời điểm thu hoạch theo tình trạng thực tế.
- Sản phẩm được kiểm tra, phân loại và ghi nhận sản lượng sau thu hoạch.
- Khách hàng chọn phương thức nhận trong phạm vi được hỗ trợ.
- Khách hàng cung cấp thông tin người nhận, địa chỉ và số điện thoại chính xác khi giao hàng.
- Shipper nhận, vận chuyển và cập nhật trạng thái theo quy trình.
- Khách hàng kiểm tra sản phẩm khi nhận và phản ánh sai lệch khi phát hiện.
- Quy trình chi tiết theo Chính sách thu hoạch và giao nhận.

5. Quy định sử dụng hệ thống
Khách hàng không:
- Cung cấp thông tin sai, giả mạo danh tính.
- Truy cập tài khoản, dữ liệu hoặc chức năng không thuộc quyền sử dụng.
- Can thiệp, phá hoại, gây quá tải hoặc gián đoạn hệ thống.
- Khai thác lỗ hổng hoặc sử dụng công cụ bất hợp pháp.
- Đăng nội dung vi phạm pháp luật hoặc xâm phạm quyền người khác.
- Lạm dụng thanh toán, khiếu nại hoặc dịch vụ để gian lận.

SmartMush có thể xác minh, hạn chế chức năng hoặc tạm khóa tài khoản theo mức độ vi phạm và căn cứ cụ thể.

6. Quyền và nghĩa vụ của SmartMush
6.1. Quyền
- Vận hành hệ thống theo phạm vi dịch vụ được công bố.
- Yêu cầu xác minh thông tin cần thiết để thực hiện giao dịch.
- Điều chỉnh quy trình nhằm nâng cao chất lượng.
- Bảo trì, nâng cấp hoặc tạm hạn chế chức năng để xử lý sự cố.
- Áp dụng biện pháp phù hợp đối với hành vi vi phạm.

6.2. Nghĩa vụ
- Cung cấp thông tin dịch vụ rõ ràng.
- Tổ chức trồng, chăm sóc, thu hoạch theo nội dung đã xác nhận.
- Cập nhật dữ liệu mùa vụ trong phạm vi hệ thống ghi nhận.
- Bảo vệ thông tin cá nhân theo Chính sách bảo mật.
- Tiếp nhận hỗ trợ, khiếu nại và thực hiện khắc phục khi có căn cứ trách nhiệm.

7. Quyền và nghĩa vụ của khách hàng
7.1. Quyền
- Nhận thông tin gói, giá và điều kiện trước khi xác nhận.
- Theo dõi tiến độ và dữ liệu được hệ thống hỗ trợ.
- Nhận thông báo về thay đổi quan trọng.
- Sử dụng thu hoạch/giao nhận theo phạm vi đã đăng ký.
- Yêu cầu hỗ trợ, khiếu nại và giải quyết tranh chấp.

7.2. Nghĩa vụ
- Cung cấp thông tin chính xác, thanh toán đúng hạn.
- Bảo mật tài khoản và tuân thủ hướng dẫn.
- Phối hợp xác minh, nhận hàng và xử lý sự cố.
- Không can thiệp trái phép vào trang trại/thiết bị.
- Tôn trọng quyền của SmartMush, nhân sự và khách hàng khác.

8. Hủy dịch vụ và hoàn tiền
Khách hàng có thể yêu cầu hủy hoặc thay đổi theo điều kiện liên quan. Nếu đã bắt đầu chuẩn bị hoặc triển khai, yêu cầu được xem xét theo phần dịch vụ đã thực hiện, chi phí hợp lệ và trách nhiệm các bên. Giao dịch lỗi, trùng hoặc dịch vụ không được cung cấp sẽ được xử lý theo Chính sách thanh toán và Chính sách hoàn hàng, hoàn tiền.

9. Khiếu nại và giải quyết tranh chấp
Khách hàng có thể khiếu nại về chăm sóc, sản lượng, chất lượng, thanh toán hoặc giao nhận. SmartMush tiếp nhận, xác minh và phản hồi dựa trên dữ liệu và bằng chứng liên quan. Các bên ưu tiên trao đổi; khách hàng vẫn có quyền sử dụng phương thức giải quyết hợp pháp nếu không đạt thỏa thuận.

10. Quyền sở hữu trí tuệ
Giao diện, thiết kế, biểu tượng và nội dung SmartMush được bảo vệ theo pháp luật. Khách hàng không được sao chép, sửa đổi hoặc khai thác khi chưa được phép, trừ trường hợp pháp luật cho phép. Sử dụng hệ thống không chuyển giao quyền sở hữu trí tuệ.

11. Gián đoạn và sự kiện bất khả kháng
SmartMush có thể tạm gián đoạn để bảo trì hoặc xử lý sự cố. Mất điện, kết nối, lỗi IoT hoặc sự kiện khách quan có thể ảnh hưởng vận hành. SmartMush áp dụng biện pháp phù hợp trong khả năng và thông báo khi cần. Trách nhiệm được xác định theo thỏa thuận và pháp luật.

12. Thay đổi điều khoản
SmartMush có thể cập nhật để phù hợp hoạt động và pháp luật. Thay đổi quan trọng được thông báo qua hệ thống hoặc kênh liên hệ. Điều khoản mới có hiệu lực từ thời điểm công bố hoặc thời điểm được thông báo cụ thể và không làm mất quyền hợp pháp đã phát sinh.

13. Tạm ngừng và chấm dứt
- Khách hàng có thể ngừng sử dụng hoặc yêu cầu kết thúc tài khoản theo quy trình được hỗ trợ.
- Nghĩa vụ thanh toán, giao nhận và nghĩa vụ đã phát sinh vẫn được xử lý sau khi tài khoản kết thúc.
- SmartMush có thể tạm/chấm dứt khi có vi phạm nghiêm trọng, yêu cầu hợp pháp hoặc căn cứ phù hợp, đồng thời xem xét quyền lợi còn tồn tại.
- Xử lý dữ liệu sau chấm dứt tuân theo Chính sách bảo mật và pháp luật.

14. Điều khoản chung
Điều khoản áp dụng cùng các chính sách SmartMush. Nếu một nội dung không thể thực hiện theo pháp luật, nội dung còn lại vẫn áp dụng trong phạm vi hợp pháp. Vấn đề chưa quy định được xử lý theo thỏa thuận và pháp luật Việt Nam.

15. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email hỗ trợ: Smartmush194@gmail.com
- Số điện thoại: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, TP. Thủ Đức, Hồ Chí Minh, Việt Nam
- Kênh hỗ trợ: Hỗ trợ/Khiếu nại trên ứng dụng

SmartMush – Cung cấp dịch vụ minh bạch, hỗ trợ khách hàng và tôn trọng quyền lợi hợp pháp của các bên.`,
  },

  // 2. Chính sách bảo mật
  {
    id: 'privacy-policy',
    title: 'Chính sách bảo mật',
    documentTitle: 'CHÍNH SÁCH BẢO MẬT',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '21/11/2026',
    badge: 'An toàn dữ liệu',
    icon: 'shield-checkmark-outline',
    summary:
      'Quy định về thu thập, sử dụng, lưu trữ, bảo vệ và chia sẻ dữ liệu cá nhân khi khách hàng sử dụng SmartMush.',
    content: `# CHÍNH SÁCH BẢO MẬT
Hệ thống SmartMush

Cập nhật lần cuối: 21/11/2026
Ngày có hiệu lực: 21/11/2026

SmartMush tôn trọng quyền riêng tư của khách hàng và áp dụng các biện pháp phù hợp để bảo vệ thông tin cá nhân trong quá trình cung cấp dịch vụ. Chính sách này giải thích loại thông tin được thu thập, mục đích xử lý, phạm vi chia sẻ, thời gian lưu trữ và các quyền của khách hàng.

Khi đăng ký tài khoản hoặc sử dụng SmartMush, khách hàng nên đọc kỹ chính sách này. Việc thu thập và xử lý thông tin được thực hiện trong phạm vi cần thiết để cung cấp dịch vụ, đáp ứng yêu cầu hợp pháp và bảo vệ quyền lợi của khách hàng, SmartMush cũng như các bên liên quan.

1. Phạm vi áp dụng
- Chính sách áp dụng cho thông tin cá nhân của khách hàng được SmartMush thu thập, xử lý hoặc lưu trữ khi sử dụng ứng dụng và các dịch vụ liên quan.
- Thông tin môi trường hoặc thông tin vận hành không gắn trực tiếp với một cá nhân cụ thể có thể được sử dụng theo quy định của chính sách này khi trở thành thông tin nhận diện được.
- Việc xử lý dữ liệu của các đơn vị bên thứ ba được thực hiện theo chính sách riêng của họ và trong phạm vi hợp pháp.

2. Thông tin SmartMush thu thập
2.1. Thông tin tài khoản
- Họ và tên, địa chỉ email và số điện thoại.
- Thông tin đăng nhập cùng dữ liệu xác thực cần thiết để bảo vệ tài khoản.
- Thông tin hồ sơ khác mà khách hàng chủ động cung cấp hoặc cập nhật.

2.2. Thông tin đơn hàng và dịch vụ
- Gói thuê, loại nấm, số lượng phôi hoặc khay trồng.
- Thời gian thuê, thông tin mùa vụ và lịch sử sử dụng dịch vụ.
- Mã đơn hàng, trạng thái đơn hàng, thông tin thanh toán và giao dịch liên quan.
- Yêu cầu thu hoạch, nhận hàng trực tiếp hoặc giao hàng.

2.3. Thông tin theo dõi mùa vụ
- Thông tin phiên trồng, trạng thái phát triển và tiến độ chăm sóc.
- Hình ảnh, ghi chú hoặc báo cáo được tạo trong quá trình quản lý mùa vụ.
- Nhiệt độ, độ ẩm và dữ liệu môi trường do hệ thống IoT ghi nhận.
- Nhật ký cập nhật, cảnh báo và thông báo liên quan đến mùa vụ.

2.4. Thông tin giao nhận và hỗ trợ
- Tên người nhận, số điện thoại và địa chỉ giao hàng hoặc nhận hàng.
- Nội dung khiếu nại, phản hồi, yêu cầu hỗ trợ và minh chứng đính kèm.
- Lịch sử trao đổi giữa khách hàng với bộ phận hỗ trợ, chuyên gia hoặc nhân sự vận hành.

2.5. Dữ liệu kỹ thuật
- Thông tin phiên đăng nhập và dữ liệu cần thiết để xác thực, cấp quyền truy cập.
- Nhật ký hoạt động, sự kiện lỗi và thông tin kỹ thuật phục vụ vận hành, bảo mật và xử lý sự cố.
- Dữ liệu thiết bị hoặc quyền truy cập thiết bị chỉ được thu thập khi cần thiết cho chức năng mà khách hàng sử dụng và khi khách hàng cấp quyền tương ứng.

3. Mục đích sử dụng thông tin
SmartMush sử dụng thông tin trong phạm vi cần thiết cho các mục đích sau:
- Tạo, xác thực và quản lý tài khoản; hỗ trợ đăng nhập và bảo vệ phiên sử dụng.
- Tiếp nhận, xử lý và quản lý đơn thuê, mùa vụ, thu hoạch, nhận hàng và giao hàng.
- Hiển thị tiến độ trồng, hình ảnh, dữ liệu môi trường và thông báo liên quan đến dịch vụ.
- Xác nhận trạng thái thanh toán và đối soát giao dịch qua phương thức được khách hàng lựa chọn.
- Tiếp nhận, phân tích và xử lý câu hỏi, phản hồi, khiếu nại hoặc yêu cầu hỗ trợ.
- Duy trì an toàn hệ thống, kiểm soát truy cập, phát hiện hành vi bất thường và xử lý sự cố.
- Phân tích hoạt động ở mức phù hợp nhằm cải thiện chất lượng dịch vụ và trải nghiệm sử dụng.
- Thực hiện nghĩa vụ theo hợp đồng, yêu cầu của cơ quan có thẩm quyền hoặc quy định pháp luật.

SmartMush không sử dụng dữ liệu cá nhân cho mục đích khác có thể ảnh hưởng đáng kể đến quyền của khách hàng khi chưa có căn cứ pháp lý hoặc thông báo phù hợp.

4. Phạm vi chia sẻ thông tin
SmartMush không mua bán thông tin cá nhân của khách hàng. Thông tin chỉ được cung cấp khi thực sự cần thiết và theo nguyên tắc tối thiểu dữ liệu.

4.1. Nhân sự vận hành SmartMush
- Quản trị viên có thể truy cập dữ liệu cần thiết để quản lý tài khoản, đơn hàng và hệ thống.
- Farm Operator có thể tiếp cận thông tin mùa vụ, khay trồng, hình ảnh và dữ liệu vận hành phục vụ chăm sóc, theo dõi và thu hoạch.
- Nhân viên hỗ trợ hoặc chuyên gia chỉ được tiếp cận thông tin liên quan đến yêu cầu hỗ trợ, tư vấn hoặc khiếu nại được giao xử lý.
- Quyền truy cập được phân theo vai trò và phạm vi công việc.

4.2. Đơn vị thanh toán
- Thông tin giao dịch cần thiết có thể được chuyển cho đơn vị thanh toán để tạo, xử lý hoặc xác nhận thanh toán.
- SmartMush không chủ đích thu thập hoặc lưu trữ đầy đủ thông tin thẻ, mật khẩu tài khoản ngân hàng hoặc mã xác thực giao dịch.
- Dữ liệu được xử lý theo quy trình của SmartMush và chính sách của đơn vị thanh toán tương ứng.

4.3. Đơn vị vận chuyển hoặc giao nhận
- Khi khách hàng yêu cầu giao hàng, SmartMush có thể cung cấp tên người nhận, số điện thoại, địa chỉ và thông tin đơn hàng cần thiết cho đơn vị thực hiện giao nhận.
- Mọi thông tin được chia sẻ chỉ trong phạm vi phục vụ việc giao và hoàn tất đơn hàng.

4.4. Nhà cung cấp dịch vụ công nghệ
- SmartMush có thể sử dụng nhà cung cấp hạ tầng, lưu trữ, thông báo hoặc dịch vụ hỗ trợ kỹ thuật.
- Việc chia sẻ phải phục vụ vận hành SmartMush và tuân thủ nghĩa vụ bảo mật áp dụng.

4.5. Cơ quan có thẩm quyền
- SmartMush có thể cung cấp thông tin khi được yêu cầu hợp pháp, trong phạm vi thẩm quyền và theo quy định pháp luật.

5. Lưu trữ và bảo vệ thông tin
SmartMush áp dụng các biện pháp kỹ thuật và tổ chức phù hợp nhằm hạn chế nguy cơ truy cập, thay đổi, mất, sử dụng hoặc tiết lộ trái phép, bao gồm:
- Xác thực tài khoản và phân quyền truy cập theo vai trò.
- Lưu trữ thông tin xác thực ứng dụng và mã phiên trên cơ chế bảo mật phù hợp với nền tảng.
- Hạn chế truy cập dữ liệu theo nhu cầu công việc và chức năng hệ thống.
- Theo dõi, kiểm tra hoạt động và xử lý các sự cố kỹ thuật hoặc bảo mật được phát hiện.
- Chỉ chia sẻ dữ liệu cho bên thứ ba khi cần thiết để thực hiện dịch vụ hoặc theo yêu cầu pháp luật.
- Yêu cầu khách hàng bảo vệ mật khẩu, mã xác thực, thiết bị và thông tin đăng nhập của mình.

Không phương thức truyền tải hoặc lưu trữ điện tử nào có thể bảo đảm an toàn tuyệt đối. SmartMush sẽ không bỏ qua sự cố và sẽ thực hiện bước khắc phục phù hợp khi phát hiện rủi ro.

6. Quyền thiết bị trên ứng dụng
- SmartMush chỉ yêu cầu quyền truy cập máy ảnh hoặc thư viện ảnh khi khách hàng hoặc nhân sự vận hành cần chụp, chọn và đính kèm hình ảnh.
- Khách hàng có thể từ chối hoặc thu hồi quyền trên thiết bị. Một số chức năng liên quan đến hình ảnh có thể không hoạt động khi quyền bị tắt.
- SmartMush không yêu cầu quyền vị trí để hiển thị chính sách này hoặc xác định thông tin chính khách hàng đã khai báo.
- Khách hàng không bắt buộc cung cấp những dữ liệu tùy chọn nếu dữ liệu đó không cần thiết để hoàn tất chức năng đang sử dụng.

7. Thời gian lưu trữ thông tin
Thông tin cá nhân được lưu trữ trong thời gian cần thiết để:
- Duy trì tài khoản và cung cấp dịch vụ.
- Hoàn tất đơn hàng, giao dịch, mùa vụ và các yêu cầu hỗ trợ.
- Giải quyết tranh chấp, khiếu nại hoặc yêu cầu pháp lý.
- Thực hiện nghĩa vụ lưu trữ kế toán, thuế, chứng từ và nghĩa vụ khác theo pháp luật.

Khi thông tin không còn cần thiết, SmartMush sẽ xóa, ẩn danh hoặc áp dụng biện pháp xử lý phù hợp, trừ khi pháp luật hoặc quyền lợi hợp pháp cần thiết cho phép lưu trữ lâu hơn. Một số dữ liệu giao dịch hoặc khiếu nại có thể được giữ lại dù tài khoản đã ngừng sử dụng.

8. Quyền và trách nhiệm của khách hàng
8.1. Quyền của khách hàng
- Được cung cấp thông tin về loại dữ liệu được thu thập, cách thức sử dụng và phạm vi chia sẻ.
- Được truy cập, xem hoặc cập nhật thông tin cá nhân trong phạm vi chức năng hệ thống hỗ trợ.
- Được yêu cầu chỉnh sửa thông tin không chính xác hoặc không đầy đủ.
- Được yêu cầu truy cập, hạn chế, phản đối hoặc xóa dữ liệu trong phạm vi pháp luật cho phép và không ảnh hưởng đến nghĩa vụ lưu trữ bắt buộc.
- Được yêu cầu giải thích việc chia sẻ dữ liệu với bên thứ ba.
- Được phản ánh hoặc khiếu nại khi nghi ngờ thông tin bị sử dụng sai mục đích.
- Được rút lại sự đồng ý đối với hoạt động xử lý dựa trên sự đồng ý, với điều kiện không ảnh hưởng đến xử lý đã thực hiện hợp pháp trước đó.

Một số yêu cầu có thể cần xác minh danh tính và sẽ được xử lý trong thời gian phù hợp theo nội dung yêu cầu, phạm vi dữ liệu và quy định pháp luật.

8.2. Trách nhiệm của khách hàng
- Cung cấp thông tin chính xác, đầy đủ và thông báo khi có thay đổi.
- Không cung cấp dữ liệu hoặc sử dụng thông tin của người khác khi chưa được phép.
- Bảo mật mật khẩu, mã xác thực và thiết bị; không chia sẻ tài khoản cho người khác.
- Thông báo cho SmartMush khi phát hiện dấu hiệu truy cập trái phép hoặc rủi ro bảo mật.
- Cập nhật địa chỉ, số điện thoại và thông tin giao nhận trước khi SmartMush thực hiện dịch vụ.

9. Xử lý sự cố bảo mật
Khi phát hiện hoặc nhận được thông báo về sự cố liên quan đến thông tin cá nhân, SmartMush sẽ:
- Tiếp nhận và xác minh thông tin về sự cố.
- Thực hiện các biện pháp cần thiết để hạn chế hoặc ngăn chặn ảnh hưởng.
- Đánh giá phạm vi dữ liệu, người bị ảnh hưởng và mức độ rủi ro.
- Phối hợp khắc phục, phục hồi hệ thống và hạn chế nguy cơ tái diễn.
- Thông báo cho khách hàng hoặc cơ quan có thẩm quyền khi pháp luật yêu cầu hoặc khi việc thông báo là cần thiết để bảo vệ khách hàng.

10. Thay đổi chính sách
SmartMush có thể cập nhật chính sách để phản ánh thay đổi về chức năng, cách vận hành hoặc yêu cầu pháp lý. Đối với thay đổi quan trọng, SmartMush sẽ thông báo qua ứng dụng hoặc kênh liên hệ phù hợp. Ngày cập nhật tại đầu văn bản thể hiện phiên bản đang có hiệu lực.

11. Thông tin liên hệ và hỗ trợ
Khách hàng có thể liên hệ để hỏi về quyền riêng tư, cập nhật dữ liệu, phản ánh hoặc gửi yêu cầu liên quan đến thông tin cá nhân:
- Đơn vị vận hành: SmartMush Farm
- Email hỗ trợ: Smartmush194@gmail.com
- Số điện thoại: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, TP. Thủ Đức, Hồ Chí Minh, Việt Nam

SmartMush sẽ xác minh nội dung và phạm vi yêu cầu trước khi cung cấp, sửa đổi hoặc xóa dữ liệu để bảo vệ đúng chủ thể thông tin.

SmartMush – Minh bạch trong vận hành, an toàn trong quản lý và tôn trọng quyền riêng tư của khách hàng.`,
  },

  // 3. Chính sách thanh toán
  {
    id: 'payment-policy',
    title: 'Chính sách thanh toán',
    documentTitle: 'CHÍNH SÁCH THANH TOÁN',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '21/11/2026',
    badge: 'Giao dịch an toàn',
    icon: 'card-outline',
    summary:
      'Quy định phương thức PayOS, quy trình xác nhận giao dịch, trách nhiệm của khách hàng và cách xử lý sự cố thanh toán.',
    content: `# CHÍNH SÁCH THANH TOÁN
Hệ thống SmartMush

Cập nhật lần cuối: 21/11/2026
Ngày có hiệu lực: 21/11/2026

SmartMush xây dựng chính sách thanh toán nhằm giúp quá trình đăng ký và thanh toán dịch vụ thuê trồng nấm được minh bạch, thuận tiện và an toàn. Chính sách quy định phương thức thanh toán, quy trình xác nhận giao dịch, trách nhiệm của các bên và cách xử lý vấn đề phát sinh.

Khi thực hiện thanh toán trên SmartMush, khách hàng cần kiểm tra đầy đủ thông tin đơn hàng, số tiền và nội dung hiển thị trước khi xác nhận giao dịch.

1. Phạm vi áp dụng
Chính sách áp dụng cho các khoản thanh toán liên quan đến dịch vụ SmartMush, bao gồm:
- Phí thuê gói trồng nấm, phôi hoặc khay trồng.
- Phí dịch vụ bổ sung được hệ thống hỗ trợ.
- Phí thu hoạch, đóng gói, nhận hàng hoặc giao hàng nếu được áp dụng.
- Các giao dịch tài chính khác được SmartMush thông báo rõ khi khách hàng xác nhận.

2. Phương thức thanh toán
2.1. Thanh toán qua PayOS
- SmartMush hỗ trợ thanh toán trực tuyến thông qua cổng thanh toán PayOS được tích hợp trong hệ thống.
- Hệ thống có thể cung cấp mã QR hoặc thông tin giao dịch để khách hàng thực hiện trên ứng dụng/ngân hàng hỗ trợ.
- SmartMush không yêu cầu khách hàng cung cấp mật khẩu ngân hàng, mã OTP hoặc thông tin xác thực giao dịch cho nhân sự SmartMush.

2.2. Xác nhận thanh toán
- SmartMush chỉ ghi nhận đơn hàng đã thanh toán khi nhận được kết quả giao dịch hợp lệ từ PayOS hoặc nguồn đối soát được hệ thống chấp nhận.
- Trạng thái có thể hiển thị là đang xử lý, thành công, thất bại, hết hạn hoặc bị hủy.
- Việc hiển thị mã QR không đồng nghĩa giao dịch đã thành công.
- Khách hàng nên kiểm tra trạng thái trong thông tin đơn hàng và tránh chỉ dựa vào màn hình từ thiết bị hoặc ứng dụng thanh toán.

3. Quy trình thanh toán
Bước 1: Lựa chọn dịch vụ
Khách hàng lựa chọn loại nấm, số lượng phôi hoặc khay trồng và các dịch vụ được hệ thống hỗ trợ. Gói thuê được hệ thống tự chọn theo thời gian sinh trưởng dự kiến và hiển thị trước khi xác nhận.

Bước 2: Kiểm tra đơn hàng
Hệ thống hiển thị các thông tin cần thiết, gồm:
- Loại nấm, gói thuê hệ thống tự chọn và số lượng.
- Thời gian hoặc điều kiện dịch vụ dự kiến.
- Phí dịch vụ và khoản bổ sung được áp dụng.
- Tổng số tiền cần thanh toán.

Khách hàng chịu trách nhiệm kiểm tra trước khi tiếp tục.

Bước 3: Thực hiện giao dịch
Khách hàng sử dụng mã QR hoặc thông tin được PayOS cung cấp, thực hiện đúng số tiền và nội dung do hệ thống hiển thị.

Bước 4: Chờ và kiểm tra kết quả
- Thành công: SmartMush ghi nhận giao dịch và chuyển đơn hàng sang bước xử lý tiếp theo.
- Thất bại, bị hủy hoặc hết hạn: Đơn hàng chưa được xác nhận thanh toán.
- Đang xử lý: Khách hàng cần chờ kết quả cuối cùng và không tạo thêm giao dịch lặp lại.

Bước 5: Xác nhận dịch vụ
Sau khi thanh toán được xác nhận, SmartMush xử lý đơn hàng theo quy trình vận hành. Việc thanh toán không mặc nhiên đồng nghĩa mùa vụ hoặc dịch vụ được bắt đầu ngay lập tức.

4. Giá dịch vụ và các khoản phí
- Giá và tổng số tiền được xác định từ thông tin đơn hàng tại thời điểm khách hàng xác nhận thanh toán.
- Phí giao hàng, đóng gói, thu hoạch hoặc dịch vụ bổ sung chỉ áp dụng khi được thông báo trước khi khách hàng chấp thuận.
- SmartMush không chủ đích thu khoản phí ngoài nội dung đã hiển thị hoặc được khách hàng xác nhận.
- Nếu số tiền hoặc khoản phí chưa rõ, khách hàng nên liên hệ hỗ trợ trước khi thanh toán.

5. Thời điểm thanh toán
- Khách hàng thực hiện thanh toán theo yêu cầu hiển thị khi đăng ký hoặc xác nhận dịch vụ.
- Đơn hàng chỉ được xem là đã thanh toán sau khi hệ thống nhận kết quả giao dịch hợp lệ.
- Việc phân bổ khay trồng, xác nhận mùa vụ, thu hoạch hoặc giao hàng được thực hiện theo quy trình vận hành và tình trạng dịch vụ thực tế.
- Chi phí bổ sung phát sinh sau đăng ký phải được thông báo để khách hàng xem xét trước khi thanh toán.

6. Xử lý giao dịch chưa thành công
6.1. Giao dịch thất bại, bị hủy hoặc hết hạn
Đơn hàng chưa được xác nhận thanh toán. Khách hàng có thể kiểm tra nguyên nhân và tạo giao dịch mới nếu hệ thống cho phép.

6.2. Giao dịch đang xử lý
Khách hàng nên chờ kết quả cập nhật và tránh thanh toán lại ngay. Việc đồng bộ có thể cần thời gian phụ thuộc vào PayOS hoặc ngân hàng.

6.3. Đã trừ tiền nhưng hệ thống chưa cập nhật
Khách hàng không nên tạo thêm giao dịch. Cần lưu mã đơn hàng, mã giao dịch, thời gian và bằng chứng thanh toán để SmartMush kiểm tra, đối soát.

6.4. Thanh toán trùng hoặc sai số tiền
SmartMush sẽ kiểm tra lịch sử đơn hàng và giao dịch liên quan. Việc điều chỉnh hoặc hoàn tiền được xử lý theo kết quả đối soát, Chính sách Hủy đơn và Hoàn tiền và quy định của phương thức thanh toán.

7. Chứng từ và thông tin giao dịch
- Sau khi giao dịch hoàn tất, SmartMush ghi nhận các thông tin cần thiết để đối chiếu trạng thái đơn hàng.
- Khách hàng nên lưu mã giao dịch, thời gian, số tiền và thông tin đơn hàng.
- Khách hàng có thể xem trạng thái thanh toán trong chức năng đơn hàng được hệ thống hỗ trợ.
- Nếu cần chứng từ hoặc hóa đơn, khách hàng liên hệ SmartMush để được hướng dẫn và cung cấp thông tin cần thiết.
- Yêu cầu hóa đơn không tự động làm thay đổi giá trị hoặc trạng thái giao dịch đã thực hiện.

8. Trách nhiệm của khách hàng
- Cung cấp thông tin chính xác và sử dụng đúng tài khoản khi thanh toán.
- Kiểm tra gói dịch vụ, số lượng, số tiền và thông tin đơn hàng trước khi xác nhận.
- Bảo mật tài khoản ngân hàng, mật khẩu và mã xác thực; không cung cấp thông tin này cho người khác.
- Chỉ thực hiện giao dịch trên kênh được SmartMush hoặc PayOS cung cấp.
- Không thanh toán lặp lại khi giao dịch đang xử lý nếu chưa nhận hướng dẫn kiểm tra.
- Cung cấp mã đơn hàng, mã giao dịch và bằng chứng phù hợp khi yêu cầu đối soát.
- Không khai thác lỗi, che giấu hoặc lợi dụng sai lệch giao dịch.

9. Trách nhiệm của SmartMush
- Hiển thị thông tin phí và tổng số tiền trước bước xác nhận thanh toán.
- Ghi nhận và cập nhật trạng thái giao dịch dựa trên dữ liệu hợp lệ nhận được từ PayOS hoặc quy trình đối soát.
- Hỗ trợ khách hàng kiểm tra giao dịch lỗi, chậm cập nhật hoặc thanh toán trùng.
- Phối hợp với đơn vị thanh toán trong phạm vi cần thiết để xử lý sự cố.
- Bảo vệ thông tin giao dịch theo Chính sách bảo mật và hạn chế truy cập theo vai trò.
- Không cam kết thời gian xử lý cố định khi kết quả còn phụ thuộc vào ngân hàng, PayOS hoặc đơn vị thanh toán khác.

10. Hoàn tiền và khiếu nại
- Yêu cầu hoàn tiền, hủy đơn hoặc điều chỉnh thanh toán được xem xét theo Chính sách Hủy đơn và Hoàn tiền.
- Khiếu nại thanh toán cần nêu mã đơn hàng, mã giao dịch, thời gian, số tiền và nội dung sự cố.
- Việc xác nhận giao dịch trùng, sai hoặc không thành công phụ thuộc vào đối chiếu dữ liệu thực tế.

11. Thay đổi chính sách
SmartMush có thể cập nhật chính sách để phù hợp với thay đổi về phương thức thanh toán, quy trình vận hành hoặc quy định pháp luật. Những thay đổi quan trọng sẽ được thông báo qua ứng dụng hoặc kênh liên hệ phù hợp.

12. Thông tin liên hệ và hỗ trợ
- Đơn vị vận hành: SmartMush Farm
- Email hỗ trợ: Smartmush194@gmail.com
- Số điện thoại: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, TP. Thủ Đức, Hồ Chí Minh, Việt Nam

Khi yêu cầu hỗ trợ, khách hàng nên cung cấp mã đơn hàng, mã giao dịch, thời gian thanh toán và mô tả sự cố để SmartMush có thể kiểm tra.

SmartMush – Minh bạch trong thanh toán, an tâm trong trải nghiệm dịch vụ.`,
  },

  // 4. Chính sách hoàn tiền
  {
    id: 'refund-policy',
    title: 'Chính sách hoàn hàng và hoàn tiền',
    documentTitle: 'CHÍNH SÁCH HOÀN HÀNG VÀ HOÀN TIỀN',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '21/11/2026',
    badge: 'Hoàn hàng & Hoàn tiền',
    icon: 'cash-outline',
    summary:
      'Quy định điều kiện hoàn hàng, các trường hợp được xem xét hoàn tiền và quy trình kiểm tra, đổi hàng hoặc hoàn phí.',
    content: `# CHÍNH SÁCH HOÀN HÀNG VÀ HOÀN TIỀN
Hệ thống SmartMush

Cập nhật lần cuối: 21/11/2026
Ngày có hiệu lực: 21/11/2026

SmartMush hướng đến việc cung cấp dịch vụ thuê trồng nấm minh bạch và bảo vệ quyền lợi hợp pháp của khách hàng. Chính sách quy định trường hợp được xem xét hoàn hàng, hoàn tiền, điều kiện tiếp nhận, quy trình xác minh và cách thực hiện phương án xử lý.

1. Phạm vi áp dụng
Chính sách áp dụng đối với:
- Dịch vụ thuê trồng nấm theo gói.
- Sản phẩm nấm sau thu hoạch.
- Dịch vụ thu hoạch, đóng gói, nhận hàng hoặc giao hàng nếu được áp dụng.
- Giao dịch thanh toán liên quan đến dịch vụ trên SmartMush.

2. Nguyên tắc chung
- Mọi yêu cầu được xem xét dựa trên tình trạng đơn hàng, bằng chứng, phần dịch vụ đã thực hiện, nguyên nhân phát sinh và quy định pháp luật.
- Việc nhận yêu cầu không đồng nghĩa yêu cầu được chấp nhận hoặc khoản hoàn tiền được thực hiện.
- Phương án xử lý có thể là đổi hàng, bổ sung sản phẩm, hoàn một phần, hoàn toàn bộ hoặc phương án hỗ trợ khác phù hợp với kết quả xác minh.
- SmartMush sẽ thông báo kết quả và lý do trong phạm vi thông tin có thể cung cấp.

3. Các trường hợp được xem xét hoàn tiền
3.1. Khách hàng hủy dịch vụ
- Khách hàng có thể yêu cầu hủy trước khi mùa vụ được triển khai.
- Nếu yêu cầu được chấp thuận và chưa phát sinh chi phí thực tế, SmartMush có thể xem xét hoàn khoản đã thanh toán.
- Nếu quá trình chuẩn bị hoặc mùa vụ đã bắt đầu, số tiền hoàn được xác định dựa trên phần dịch vụ chưa thực hiện, chi phí hợp lệ đã phát sinh và trách nhiệm của các bên.

3.2. SmartMush không thể cung cấp dịch vụ
Khách hàng có thể yêu cầu xem xét hoàn tiền khi SmartMush không thể:
- Bố trí khu vực hoặc khay trồng như đã xác nhận.
- Triển khai hoặc tiếp tục mùa vụ theo thỏa thuận.
- Cung cấp dịch vụ do sự cố vận hành nghiêm trọng thuộc trách nhiệm của SmartMush.

3.3. Mùa vụ gặp sự cố nghiêm trọng
SmartMush sẽ kiểm tra dữ liệu mùa vụ, lịch sử chăm sóc, điều kiện thực tế và nguyên nhân sự cố:
- Nếu lỗi phát sinh thuộc trách nhiệm vận hành của SmartMush, khách hàng có thể được xem xét đổi phương án dịch vụ hoặc hoàn một phần/toàn bộ giá trị chịu ảnh hưởng.
- Nếu liên quan đến đặc tính sinh học, điều kiện khách quan hoặc yếu tố ngoài khả năng kiểm soát hợp lý, SmartMush xem xét từng trường hợp và đề xuất phương án phù hợp.
- Chỉ kết quả kiểm tra và thỏa thuận xử lý xác định mức hoàn hoặc phương án thay thế.

3.4. Dịch vụ bổ sung chưa được cung cấp
Khách hàng có thể được xem xét hoàn khoản phí đã xác nhận cho dịch vụ không được thực hiện, như thu hoạch, đóng gói hoặc giao hàng, sau khi kiểm tra trạng thái thực tế.

3.5. Giao dịch thanh toán lỗi hoặc trùng
Các trường hợp được xem xét gồm:
- Tài khoản bị trừ tiền nhưng hệ thống chưa ghi nhận thanh toán hợp lệ.
- Thanh toán nhiều lần cho cùng đơn hàng.
- Số tiền giao dịch thực tế vượt số tiền cần thanh toán.

SmartMush sẽ đối soát trước khi điều chỉnh, hoàn khoản thừa hoặc phối hợp với đơn vị thanh toán.

4. Chính sách hoàn hàng
Sản phẩm nấm tươi có thời gian bảo quản hạn chế nên khách hàng nên kiểm tra ngay khi nhận hàng.

4.1. Trường hợp được xem xét
- Sản phẩm không đúng loại hoặc thông tin đã xác nhận.
- Số lượng nhận không đúng theo thông tin bàn giao.
- Sản phẩm giao nhầm hoặc không thuộc đơn hàng của khách hàng.
- Sản phẩm bị dập nát, hư hỏng trong quá trình đóng gói hoặc vận chuyển.
- Bao bì hư hỏng nghiêm trọng ảnh hưởng trực tiếp đến chất lượng sản phẩm.
- Sản phẩm có dấu hiệu hư hỏng bất thường hoặc không đáp ứng tiêu chuẩn đã công bố tại thời điểm nhận.

4.2. Trường hợp có thể không đủ điều kiện
Sau khi xác minh, SmartMush có thể từ chối hoàn hàng nếu:
- Sản phẩm đã được sử dụng hoặc bảo quản sai hướng dẫn sau khi bàn giao và nguyên nhân hư hỏng thuộc về điều đó.
- Hư hỏng phát sinh do tác động hoặc bảo quản từ phía khách hàng.
- Khiếu nại không liên quan đến số lượng, chất lượng hoặc nội dung đã xác nhận.
- Yêu cầu không có thông tin hoặc bằng chứng đủ để xác minh trong điều kiện hợp lý.

Việc từ chối phải dựa trên kết quả xác minh cụ thể và không làm mất quyền hợp pháp của khách hàng theo quy định pháp luật.

5. Thời hạn gửi yêu cầu
- Khách hàng được khuyến nghị kiểm tra sản phẩm ngay khi nhận và gửi khiếu nại trong vòng 24 giờ đối với vấn đề có thể nhận biết khi bàn giao.
- Với lỗi chất lượng tiềm ẩn không thể phát hiện ngay, khách hàng nên thông báo ngay khi phát hiện.
- Thời hạn khuyến nghị giúp bảo toàn tình trạng sản phẩm và tăng khả năng xác minh; thời hạn này không tự động loại trừ quyền khiếu nại hoặc quyền khác theo pháp luật.
- Khi gửi yêu cầu, khách hàng nên cung cấp hình ảnh/video, mã đơn hàng, thời gian nhận và mô tả rõ vấn đề.

6. Quy trình xử lý
Bước 1: Gửi yêu cầu
Khách hàng sử dụng chức năng khiếu nại/hỗ trợ và cung cấp mã đơn, loại yêu cầu, lý do, mô tả và hình ảnh minh chứng nếu có.

Bước 2: Tiếp nhận
SmartMush ghi nhận yêu cầu và chuyển đến bộ phận phụ trách. Khách hàng có thể theo dõi trạng thái trong phạm vi chức năng được hỗ trợ.

Bước 3: Xác minh
SmartMush có thể kiểm tra:
- Lịch sử đơn hàng và thanh toán.
- Thông tin thu hoạch, đóng gói và bàn giao.
- Hình ảnh hoặc dữ liệu trạng thái sản phẩm.
- Thông tin giao nhận.
- Nhật ký mùa vụ, dữ liệu chăm sóc và môi trường khi cần thiết.

Nhân sự phụ trách có thể yêu cầu bổ sung thông tin để làm rõ.

Bước 4: Đề xuất phương án
Sau khi xác minh, SmartMush có thể đề xuất đổi hàng, giao bổ sung, hoàn toàn bộ, hoàn một phần, thu hồi sản phẩm hoặc phương án hỗ trợ khác.

Bước 5: Thực hiện và hoàn tất
Sau khi phương án được xác nhận, SmartMush thực hiện xử lý, cập nhật trạng thái và thông báo kết quả.

7. Xác định số tiền hoàn
Số tiền hoàn được xem xét dựa trên:
- Số tiền khách hàng thực tế đã thanh toán.
- Phần dịch vụ hoặc sản phẩm đã cung cấp.
- Phần dịch vụ chưa thực hiện hoặc phần sản phẩm bị ảnh hưởng.
- Chi phí hợp lệ đã phát sinh.
- Nguyên nhân, mức độ ảnh hưởng và trách nhiệm của các bên.

Khoản hoàn có thể là toàn bộ hoặc một phần. Với giao dịch trùng hoặc thanh toán thừa, số tiền được xem xét hoàn tương ứng với khoản thừa đã đối soát.

8. Phương thức và thời gian hoàn tiền
- SmartMush ưu tiên hoàn qua phương thức thanh toán ban đầu nếu cổng thanh toán hỗ trợ.
- Nếu không thể hoàn qua phương thức ban đầu, SmartMush sẽ liên hệ để thống nhất phương án phù hợp trong khuôn khổ pháp luật.
- Thời gian tiền ghi có vào tài khoản có thể phụ thuộc ngân hàng, PayOS và đơn vị liên quan.
- Khách hàng sẽ được thông báo khi yêu cầu được duyệt và khi SmartMush hoàn tất xử lý từ phía hệ thống.
- SmartMush không yêu cầu mật khẩu, mã OTP hoặc thông tin xác thực bí mật để hoàn tiền.

9. Các trường hợp không áp dụng hoàn tiền tự động
SmartMush không tự động chấp nhận hoàn tiền khi:
- Dịch vụ đã được thực hiện đúng thỏa thuận và khách hàng chỉ thay đổi nhu cầu.
- Thông tin sai từ khách hàng khiến việc thực hiện dịch vụ không thể hoàn tất.
- Sản phẩm đã bàn giao đúng đơn hàng và không phát hiện lỗi chất lượng qua xác minh.
- Yêu cầu chưa có đủ thông tin để kiểm tra.

Các trường hợp này vẫn được tiếp nhận xem xét nếu khách hàng có căn cứ hợp lý hoặc thuộc quyền được pháp luật bảo vệ.

10. Trách nhiệm của khách hàng
- Cung cấp thông tin đơn hàng và yêu cầu chính xác.
- Mô tả trung thực vấn đề và không sử dụng, điều chỉnh hoặc gây hư hỏng sản phẩm làm sai lệch kết quả xác minh.
- Cung cấp hình ảnh, video, chứng từ hoặc thông tin thanh toán khi cần.
- Phối hợp trong quá trình kiểm tra, thu hồi hoặc đổi sản phẩm.
- Bảo quản sản phẩm phù hợp và theo hướng dẫn trong thời gian chờ xử lý.
- Cung cấp thông tin nhận tiền hoàn chính xác khi được yêu cầu.

11. Trách nhiệm của SmartMush
- Tiếp nhận và xử lý yêu cầu có căn cứ minh bạch.
- Xác minh thông tin và bằng chứng trước khi đưa ra kết quả.
- Thông báo lý do chấp nhận hoặc từ chối và phương án xử lý dự kiến.
- Thực hiện khoản hoàn theo phương án đã được xác nhận.
- Cập nhật trạng thái và bảo vệ thông tin cá nhân, giao dịch của khách hàng.

12. Khiếu nại về kết quả xử lý
Khách hàng có thể gửi thêm khiếu nại hoặc yêu cầu xem xét lại khi chưa đồng ý với kết quả, kèm thông tin mới hoặc căn cứ liên quan.

13. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email hỗ trợ: Smartmush194@gmail.com
- Số điện thoại: 0379896749
- Kênh hỗ trợ: Chức năng Khiếu nại/Hỗ trợ trên ứng dụng SmartMush
- Địa chỉ: Cầu Vồng, Long Bình, TP. Thủ Đức, Hồ Chí Minh, Việt Nam

Khi liên hệ, khách hàng nên cung cấp mã đơn hàng, thời gian nhận hàng hoặc thanh toán, lý do yêu cầu và thông tin liên quan để SmartMush có thể kiểm tra.

SmartMush – Minh bạch trong xử lý, bảo vệ quyền lợi và đồng hành cùng khách hàng.`,
  },

  // 5. Chính sách thuê trồng và chăm sóc nấm
  {
    id: 'cultivation-policy',
    title: 'Chính sách thuê trồng và chăm sóc nấm',
    documentTitle: 'CHÍNH SÁCH THUÊ TRỒNG VÀ CHĂM SÓC NẤM',
    subtitle: 'SMARTMUSH – SMART MUSHROOM CULTIVATION MANAGEMENT SYSTEM',
    effectiveDate: '21/11/2026',
    badge: 'Canh tác & Dịch vụ',
    icon: 'leaf-outline',
    summary:
      'Quy định phạm vi thuê trồng, quy trình chăm sóc, theo dõi IoT, quyền lợi, trách nhiệm và giới hạn của dịch vụ mùa vụ.',
    content: `# CHÍNH SÁCH THUÊ TRỒNG VÀ CHĂM SÓC NẤM
Hệ thống SmartMush

Cập nhật lần cuối: 21/11/2026
Ngày có hiệu lực: 21/11/2026

SmartMush cung cấp dịch vụ thuê trồng nấm, cho phép khách hàng tham gia theo dõi quá trình sản xuất mà không cần trực tiếp sở hữu khu vực trồng hoặc thực hiện công việc chăm sóc kỹ thuật hằng ngày.

Chính sách quy định phạm vi dịch vụ, quy trình chăm sóc, quyền lợi và trách nhiệm của khách hàng, phạm vi công việc của SmartMush trong suốt mùa vụ.

1. Phạm vi dịch vụ thuê trồng
Dịch vụ thuê trồng nấm có thể bao gồm:
- Gói thuê được hệ thống tự chọn theo thời gian sinh trưởng dự kiến của loại nấm.
- Bố trí khu vực và khay trồng phù hợp trong phạm vi đơn thuê.
- Chuẩn bị phôi nấm tương ứng với loại nấm đã xác nhận.
- Chăm sóc và giám sát quá trình phát triển của nấm.
- Theo dõi các điều kiện môi trường qua thiết bị IoT được triển khai.
- Cập nhật tiến độ và hình ảnh mùa vụ khi hệ thống/nhân sự ghi nhận.
- Thu hoạch, phân loại và chuẩn bị bàn giao sản phẩm theo dịch vụ đã đăng ký.

Phạm vi cụ thể được xác định theo thông tin gói thuê và đơn hàng khách hàng đã xác nhận. Không phải mọi gói đều bao gồm toàn bộ dịch vụ bổ sung.

2. Đăng ký và xác nhận đơn thuê
2.1. Lựa chọn dịch vụ
Khách hàng lựa chọn:
- Loại nấm.
- Số lượng phôi hoặc khay trồng.
- Chi phí và các dịch vụ bổ sung được hiển thị.

Hệ thống tự chọn gói thuê phù hợp theo thời gian sinh trưởng dự kiến của loại nấm. Tên gói, thời hạn và chi phí được hiển thị để khách hàng kiểm tra trước khi xác nhận.

2.2. Xác nhận đơn thuê
Khách hàng cần kiểm tra loại nấm, gói thuê được hệ thống tự chọn, số lượng, chi phí và thông tin liên quan trước khi xác nhận. Việc thanh toán thực hiện theo Chính sách thanh toán.

Đơn thuê chỉ được xử lý khi đáp ứng điều kiện đăng ký, thanh toán và khả năng triển khai của trang trại.

2.3. Bố trí khu vực và khay trồng
Sau khi đơn được xác nhận, SmartMush kiểm tra khu vực, bố trí khay và phôi theo số lượng đã đăng ký, sau đó ghi nhận thông tin mùa vụ trên hệ thống.

3. Quy trình chăm sóc và vận hành
Farm Operator thực hiện công việc theo loại nấm, tình trạng phôi và quy trình vận hành tại trang trại:
- Giai đoạn chuẩn bị: Vệ sinh khu vực, kiểm tra phôi, điều kiện môi trường và bố trí vào khay trồng.
- Giai đoạn phát triển tơ nấm: Theo dõi phôi, tơ nấm và các dấu hiệu bất thường.
- Giai đoạn hình thành mầm: Theo dõi mật độ, tình trạng mầm và điều kiện môi trường.
- Giai đoạn phát triển quả thể: Kiểm tra kích thước, mức độ trưởng thành và tình trạng nấm.
- Giai đoạn thu hoạch: Đánh giá độ sẵn sàng, thu hoạch, phân loại và ghi nhận sản lượng thực tế.
- Giai đoạn kết thúc: Xử lý khay/khu vực sau mùa vụ, kiểm tra vệ sinh và cập nhật trạng thái hoàn tất.

4. Giám sát môi trường và thiết bị IoT
Hệ thống IoT hỗ trợ:
- Ghi nhận nhiệt độ, độ ẩm và các thông số khác tùy thiết bị được triển khai.
- Hiển thị dữ liệu môi trường và lịch sử được hệ thống ghi nhận.
- Hỗ trợ phát hiện thông số vượt ngưỡng theo cấu hình hiện tại.
- Hỗ trợ vận hành thiết bị chăm sóc trong phạm vi chức năng được bật.

Lưu ý: Dữ liệu IoT chỉ hỗ trợ giám sát và vận hành. Dữ liệu có thể bị trễ, thiếu hoặc sai lệch do kết nối, cảm biến hoặc thiết bị. Việc duy trì điều kiện phù hợp và xác nhận tình trạng thực tế vẫn cần kiểm tra của Farm Operator.

5. Quyền lợi của khách hàng
Trong phạm vi chức năng và dữ liệu hệ thống có sẵn, khách hàng có thể:
- Xem thông tin đơn thuê, mùa vụ, khay và trạng thái phát triển.
- Xem hình ảnh, tiến độ và thông số môi trường được ghi nhận.
- Xem sản lượng thu hoạch thực tế sau khi được cập nhật.
- Nhận thông báo về thay đổi hoặc sự cố đáng kể.
- Gửi câu hỏi, yêu cầu hỗ trợ hoặc khiếu nại về hoạt động mùa vụ.

6. Trách nhiệm của SmartMush
SmartMush chịu trách nhiệm:
- Bố trí dịch vụ theo nội dung đơn đã xác nhận.
- Chuẩn bị phôi, khu vực và khay theo phạm vi gói thuê.
- Tổ chức nhân sự chăm sóc và kiểm tra mùa vụ.
- Sử dụng dữ liệu IoT và kiểm tra thực tế để hỗ trợ vận hành.
- Cập nhật thông tin mùa vụ, thu hoạch và sự cố khi được ghi nhận.
- Thông báo thay đổi đáng kể hoặc vấn đề có thể ảnh hưởng quyền lợi khách hàng.
- Thu hoạch và bàn giao sản phẩm theo dịch vụ đã đăng ký.
- Tiếp nhận và xử lý phản hồi, yêu cầu hỗ trợ hoặc khiếu nại.

7. Trách nhiệm của khách hàng
Khách hàng cần:
- Cung cấp thông tin chính xác khi đăng ký và nhận hàng.
- Kiểm tra loại nấm, số lượng, gói dịch vụ và chi phí trước khi xác nhận.
- Thanh toán các khoản phí theo đơn đã chấp thuận.
- Theo dõi thông báo và thông tin mùa vụ trên ứng dụng.
- Liên hệ SmartMush khi phát hiện dữ liệu hoặc thông tin bất thường.
- Không tự ý can thiệp vào khu vực trồng, thiết bị hoặc hệ thống khi chưa được phép.

Khách hàng không phải trực tiếp chăm sóc kỹ thuật hằng ngày, trừ khi có thỏa thuận riêng.

8. Tiến độ và thời gian mùa vụ
- Thời gian trên ứng dụng là thời gian dự kiến theo loại nấm và gói dịch vụ.
- Thời gian thực tế có thể thay đổi theo điều kiện môi trường, tình trạng phôi và đặc tính sinh học.
- Thời gian dự kiến không phải cam kết ngày thu hoạch tuyệt đối.
- Thời điểm thu hoạch được xác định từ tình trạng phát triển thực tế và đánh giá của Farm Operator.
- Khi mùa vụ thay đổi đáng kể, SmartMush cập nhật thông tin trong phạm vi hệ thống hỗ trợ.

9. Sự cố trong mùa vụ
Sự cố có thể gồm điều kiện nhiệt ẩm không phù hợp, thiết bị gặp vấn đề, phôi phát triển chậm, nấm có dấu hiệu bất thường, mất điện hoặc yếu tố khách quan.

Khi phát hiện, SmartMush kiểm tra tình trạng thực tế, dữ liệu môi trường và lịch sử vận hành, sau đó áp dụng biện pháp phù hợp và thông báo khi sự cố ảnh hưởng đáng kể. Phương án hỗ trợ, thay thế, bố trí lại mùa vụ hoặc hoàn tiền phải được xem xét theo kết quả xác minh và Chính sách Hoàn hàng và Hoàn tiền.

10. Thu hoạch và bàn giao sản phẩm
- Nấm được thu hoạch khi đạt điều kiện phù hợp theo đánh giá thực tế.
- Farm Operator ghi nhận sản lượng, phân loại và chuẩn bị bàn giao.
- Khách hàng lựa chọn hình thức nhận theo các dịch vụ SmartMush hỗ trợ.
- Khách hàng nên kiểm tra số lượng và tình trạng sản phẩm khi nhận.
- Vấn đề về chất lượng hoặc số lượng được xử lý theo Chính sách Hoàn hàng và Hoàn tiền.

Sản lượng thực tế có thể khác dự kiến do đặc tính sinh học và điều kiện canh tác; SmartMush ghi nhận và thông báo sản lượng thực tế được xác nhận.

11. Giới hạn của dịch vụ
- Nấm là sinh vật sống và phụ thuộc vào nhiều yếu tố sinh học, môi trường.
- Dữ liệu cảm biến có thể bị gián đoạn hoặc sai lệch.
- IoT không thay thế việc kiểm tra trực tiếp của nhân sự vận hành.
- SmartMush không cam kết sản lượng hoặc ngày thu hoạch cố định nếu đơn hàng không quy định cụ thể.
- Các giới hạn này không miễn trừ trách nhiệm đối với lỗi thuộc phạm vi quản lý và vận hành của SmartMush.

12. Điều chỉnh và chấm dứt dịch vụ
- Khách hàng có thể yêu cầu thay đổi hoặc hủy theo điều kiện đơn hàng và Chính sách Hoàn hàng và Hoàn tiền.
- Mọi thay đổi loại nấm, số lượng hoặc thông tin dịch vụ cần được SmartMush xác nhận.
- SmartMush có thể điều chỉnh hoặc tạm dừng hoạt động khi điều kiện vận hành hoặc an toàn không đảm bảo.
- Thay đổi đáng kể đối với dịch vụ đã xác nhận sẽ được thông báo để thống nhất phương án phù hợp.
- Việc chấm dứt dịch vụ thực hiện theo thỏa thuận và các chính sách liên quan.

13. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email hỗ trợ: Smartmush194@gmail.com
- Số điện thoại: 0379896749
- Kênh hỗ trợ: Chức năng Hỗ trợ/Khiếu nại trên ứng dụng
- Địa chỉ: Cầu Vồng, Long Bình, Hồ Chí Minh, Việt Nam

Khi liên hệ, khách hàng nên cung cấp mã đơn hàng hoặc mã mùa vụ để SmartMush kiểm tra chính xác.

SmartMush – Đồng hành cùng khách hàng trong từng giai đoạn phát triển của mùa vụ nấm.`,
  },

  // 6. Chính sách thu hoạch và giao nhận
  {
    id: 'harvest-delivery-policy',
    title: 'Chính sách thu hoạch và giao nhận',
    documentTitle: 'CHÍNH SÁCH THU HOẠCH VÀ GIAO NHẬN',
    subtitle: 'HARVEST & DELIVERY POLICY – SMARTMUSH',
    effectiveDate: '21/11/2026',
    badge: 'Hậu cần & Vận chuyển',
    icon: 'car-outline',
    summary:
      'Quy định thời điểm và quy trình thu hoạch, xác nhận sản lượng, phương thức giao nhận, trách nhiệm và xử lý sự cố.',
    content: `# CHÍNH SÁCH THU HOẠCH VÀ GIAO NHẬN
Hệ thống SmartMush

Cập nhật lần cuối: 21/11/2026
Ngày có hiệu lực: 21/11/2026

Chính sách thu hoạch và giao nhận quy định quy trình xác định thời điểm thu hoạch, ghi nhận sản lượng và nhận nấm sau khi hoàn tất chăm sóc. Chính sách áp dụng cho khách hàng sử dụng dịch vụ thuê trồng và chăm sóc nấm của SmartMush.

1. Phạm vi áp dụng
Chính sách áp dụng cho hoạt động:
- Theo dõi, thu hoạch, phân loại và cân đo sản lượng nấm.
- Nhận sản phẩm tại trang trại.
- Giao hàng bởi Shipper được SmartMush phân công.
- Xác nhận bàn giao, xử lý sự cố và phản ánh liên quan.

2. Chính sách thu hoạch
2.1. Xác định thời điểm thu hoạch
- Farm Operator theo dõi sự phát triển và tình trạng thực tế của nấm.
- Thời điểm thu hoạch được xác định theo loại nấm, độ trưởng thành và điều kiện kỹ thuật phù hợp.
- Khi đạt điều kiện, Farm Operator cập nhật trạng thái thu hoạch trên hệ thống.
- SmartMush thông báo cho khách hàng trong phạm vi chức năng hiện có.
- Thời điểm dự kiến có thể thay đổi theo điều kiện môi trường và quá trình sinh trưởng thực tế.

2.2. Quy trình thu hoạch
- Farm Operator kiểm tra và xác nhận nấm đủ điều kiện.
- Tiến hành thu hoạch theo quy trình kỹ thuật phù hợp.
- Kiểm tra, phân loại và cân đo khối lượng thực tế.
- Ghi nhận thông tin gồm loại nấm, sản lượng, thời gian thu hoạch, hình ảnh/ghi chú nếu có.
- Thông báo kết quả để khách hàng xác nhận phương thức nhận.

2.3. Sản lượng thu hoạch
- Sản lượng được tính theo khối lượng thực tế sau thu hoạch và cân đo.
- Sản lượng có thể khác dự kiến do giống nấm, điều kiện môi trường và đặc tính sinh trưởng.
- SmartMush không cam kết sản lượng cố định trừ khi được quy định cụ thể trong gói dịch vụ hoặc đơn hàng.
- Thông tin sản lượng thực tế được hệ thống xác nhận sẽ được cập nhật và thông báo cho khách hàng.

3. Phương thức nhận nấm
Sau khi thu hoạch, khách hàng có thể lựa chọn phương thức được SmartMush hỗ trợ:
- Nhận trực tiếp tại trang trại theo thời gian đã thống nhất.
- Giao hàng đến địa chỉ do khách hàng cung cấp, nếu dịch vụ giao hàng khả dụng.

Phí, phạm vi và điều kiện giao hàng sẽ được thông báo trước khi khách hàng xác nhận khi có áp dụng.

4. Quy trình giao hàng
- SmartMush cập nhật thông tin sản lượng và chuẩn bị sản phẩm sau thu hoạch.
- Khách hàng xác nhận phương thức nhận và kiểm tra thông tin giao hàng.
- SmartMush tạo yêu cầu giao và phân công Shipper phù hợp.
- Shipper nhận đúng sản phẩm tại trang trại và cập nhật tiến trình vận chuyển trong hệ thống.
- Sản phẩm được giao đến địa chỉ đã xác nhận.
- Khách hàng kiểm tra sản phẩm và xác nhận nhận hàng.
- Hệ thống cập nhật trạng thái hoàn tất khi bàn giao được ghi nhận.

5. Quy trình nhận trực tiếp
- Khách hàng thống nhất thời gian nhận với SmartMush.
- Farm Operator chuẩn bị sản phẩm theo sản lượng đã ghi nhận.
- Khách hàng kiểm tra số lượng và tình trạng sản phẩm.
- Hai bên xác nhận bàn giao.
- Hệ thống cập nhật trạng thái nhận hàng khi chức năng được hỗ trợ.

6. Trách nhiệm của các bên
6.1. SmartMush
- Tổ chức thu hoạch phù hợp thông qua Farm Operator.
- Kiểm tra, phân loại và ghi nhận sản lượng thực tế.
- Cung cấp thông tin thu hoạch và chuẩn bị sản phẩm rõ ràng.
- Phối hợp giao nhận, cập nhật trạng thái và tiếp nhận phản ánh.

6.2. Farm Operator
- Theo dõi và xác định thời điểm đạt điều kiện thu hoạch.
- Thực hiện thu hoạch, phân loại, cân đo và ghi nhận thông tin.
- Chuẩn bị bàn giao cho khách hàng hoặc Shipper.
- Phối hợp xử lý vấn đề phát sinh tại trang trại.

6.3. Shipper
- Kiểm tra đơn giao được phân công.
- Nhận đúng sản phẩm và số lượng theo bàn giao.
- Bảo quản phù hợp trong quá trình vận chuyển.
- Cập nhật trạng thái giao hàng theo tiến trình thực tế.
- Bàn giao đúng địa chỉ và thông báo sự cố, chậm trễ hoặc không thể hoàn tất.

6.4. Khách hàng
- Cung cấp địa chỉ, số điện thoại và thông tin người nhận chính xác.
- Theo dõi thông báo thu hoạch và giao nhận.
- Có mặt hoặc bố trí người nhận tại thời gian đã thống nhất.
- Kiểm tra sản phẩm sau khi nhận.
- Xác nhận nhận hàng khi đã nhận sản phẩm.
- Thông báo sai lệch, hư hỏng hoặc vấn đề liên quan.

7. Xử lý sự cố giao nhận
7.1. Không giao thành công
Nếu khách hàng không có mặt, địa chỉ không chính xác hoặc phát sinh nguyên nhân khách quan:
- Shipper cập nhật trạng thái và thông báo SmartMush.
- SmartMush liên hệ để thống nhất phương án tiếp theo.
- Giao lại, đổi địa chỉ hoặc chi phí phát sinh, nếu có, được xử lý theo thông báo và thỏa thuận cụ thể.

7.2. Sản phẩm bị hư hỏng hoặc sai thông tin
Khách hàng nên thông báo kèm hình ảnh hoặc thông tin liên quan. SmartMush kiểm tra thu hoạch, bàn giao và vận chuyển rồi xem xét đổi hàng, giao bổ sung, hoàn tiền hoặc phương án khác theo Chính sách Khiếu nại và Hoàn hàng, Hoàn tiền.

7.3. Sản lượng khác dự kiến
SmartMush đối chiếu sản lượng thực tế với đơn hàng/gói dịch vụ. Farm Operator kiểm tra dữ liệu khi có phản ánh và SmartMush giải thích chênh lệch theo thỏa thuận đã xác nhận.

8. Xác nhận hoàn tất
Hoạt động được ghi nhận hoàn tất khi:
- Đã thu hoạch, phân loại và ghi nhận sản lượng.
- Sản phẩm đã bàn giao cho khách hàng hoặc Shipper theo phương thức đã thống nhất.
- Kết quả nhận hàng được khách hàng xác nhận hoặc SmartMush ghi nhận xử lý phù hợp khi có sự cố.
- Hệ thống cập nhật trạng thái và lịch sử tương ứng.

Việc xác nhận nhận hàng không làm mất quyền phản ánh về vấn đề không thể phát hiện hợp lý tại thời điểm bàn giao.

9. Phản ánh và khiếu nại
Khách hàng có thể gửi phản ánh về:
- Sản lượng, chất lượng hoặc tình trạng sản phẩm.
- Sai lệch thông tin bàn giao.
- Chậm trễ, thất lạc hoặc sự cố giao hàng.
- Quy trình và thái độ giao nhận.

SmartMush tiếp nhận, kiểm tra dữ liệu hệ thống, bàn giao và bằng chứng trước khi phản hồi theo quy trình khiếu nại.

10. Điều khoản áp dụng
- Khách hàng nên đọc chính sách trước khi sử dụng dịch vụ.
- Chi phí ngoài phạm vi gói được thông báo và thống nhất trước khi thực hiện.
- SmartMush có thể cập nhật chính sách và thông báo thay đổi quan trọng qua hệ thống.
- Vấn đề chưa quy định sẽ xử lý theo đơn hàng, chính sách liên quan và pháp luật hiện hành.
- Việc xử lý lỗi sản phẩm không tự động đồng nghĩa bồi thường hoặc hoàn tiền trước khi xác minh.

SmartMush – Minh bạch thông tin thu hoạch, rõ ràng trong bàn giao và hỗ trợ khách hàng trong quá trình nhận sản phẩm.`,
  },

  // 7. Chính sách khiếu nại và giải quyết tranh chấp
  {
    id: 'complaint-dispute-policy',
    title: 'Chính sách khiếu nại và giải quyết tranh chấp',
    documentTitle: 'CHÍNH SÁCH KHIẾU NẠI VÀ GIẢI QUYẾT TRANH CHẤP',
    subtitle: 'COMPLAINT & DISPUTE RESOLUTION POLICY – SMARTMUSH',
    effectiveDate: '21/11/2026',
    badge: 'Khiếu nại & Hỗ trợ',
    icon: 'alert-circle-outline',
    summary:
      'Quy định phạm vi khiếu nại, quy trình tiếp nhận, xác minh, xem xét lại và giải quyết tranh chấp minh bạch.',
    content: `# CHÍNH SÁCH KHIẾU NẠI VÀ GIẢI QUYẾT TRANH CHẤP
Hệ thống SmartMush

Cập nhật lần cuối: 21/11/2026
Ngày có hiệu lực: 21/11/2026

Chính sách được xây dựng nhằm bảo vệ quyền lợi hợp pháp của khách hàng, thiết lập phương thức tiếp nhận và giải quyết phản ánh liên quan đến dịch vụ thuê trồng, chăm sóc, thu hoạch, giao nhận và thanh toán trên SmartMush.

1. Phạm vi áp dụng
Chính sách áp dụng cho khách hàng sử dụng các dịch vụ của SmartMush và các vấn đề phát sinh trong quá trình quản lý tài khoản, đơn hàng, mùa vụ, thanh toán, thu hoạch hoặc giao nhận.

2. Các trường hợp được tiếp nhận
2.1. Trồng và chăm sóc
- Quy trình chăm sóc không phù hợp với nội dung gói dịch vụ đã xác nhận.
- Tiến độ hoặc thông tin mùa vụ sai lệch, thiếu hoặc không được cập nhật phù hợp.
- Môi trường có dấu hiệu bất thường nhưng không được kiểm tra, xử lý hoặc thông báo trong phạm vi cần thiết.
- Dịch vụ thực tế khác với đơn hàng hoặc thỏa thuận đã xác nhận.

2.2. Chất lượng và sản lượng
- Sản phẩm không đúng loại nấm đã đăng ký.
- Chất lượng không phù hợp với tiêu chuẩn đã công bố hoặc xác nhận.
- Sản lượng khác với cam kết cụ thể được ghi trong gói dịch vụ/đơn hàng.
- Sản phẩm hư hỏng hoặc không đảm bảo tình trạng khi bàn giao.

2.3. Thanh toán
- Tài khoản bị trừ tiền nhưng hệ thống không ghi nhận thanh toán hợp lệ.
- Phí không đúng với thông tin đã xác nhận.
- Thanh toán trùng lặp hoặc vượt số tiền phải trả.
- Yêu cầu hoàn tiền chưa được xử lý theo phương án đã thống nhất.

2.4. Giao nhận
- Giao hàng chậm so với lịch đã xác nhận mà không có thông báo phù hợp.
- Hàng thất lạc, giao sai hoặc bị hư hỏng trong quá trình vận chuyển.
- Thái độ hoặc quy trình giao nhận không phù hợp.

2.5. Tài khoản và hỗ trợ
- Thông tin tài khoản hoặc đơn hàng hiển thị sai.
- Khách hàng gặp lỗi sử dụng chức năng hệ thống.
- Yêu cầu hỗ trợ không được phản hồi hoặc xử lý phù hợp.
- Vấn đề khác ảnh hưởng đến quyền lợi hoặc trải nghiệm sử dụng.

3. Quyền và trách nhiệm của khách hàng
3.1. Quyền của khách hàng
- Gửi khiếu nại qua chức năng Hỗ trợ/Khiếu nại hoặc kênh liên hệ chính thức.
- Theo dõi trạng thái và nhận phản hồi trong phạm vi hệ thống hỗ trợ.
- Bổ sung thông tin, hình ảnh hoặc bằng chứng khi cần.
- Nhận kết quả xác minh, căn cứ và phương án được đề xuất.
- Yêu cầu xem xét lại khi có căn cứ hoặc thông tin mới.
- Được bảo vệ thông tin cá nhân và sử dụng các phương thức giải quyết tranh chấp hợp pháp.

3.2. Trách nhiệm của khách hàng
- Cung cấp nội dung trung thực, rõ ràng và đầy đủ trong khả năng có thể.
- Ghi rõ mã đơn hàng/mùa vụ, loại vấn đề và mong muốn giải quyết.
- Cung cấp hình ảnh, video, hóa đơn hoặc tài liệu liên quan nếu có.
- Phối hợp trả lời yêu cầu xác minh và bổ sung thông tin.
- Không sử dụng quy trình khiếu nại nhằm cung cấp thông tin sai hoặc gây ảnh hưởng không chính đáng.

4. Quy trình xử lý khiếu nại
Bước 1: Gửi khiếu nại
Khách hàng cung cấp loại khiếu nại, đơn hàng hoặc phiên trồng liên quan, mô tả vấn đề, bằng chứng và yêu cầu xử lý. Sau khi gửi thành công, hệ thống ghi nhận hồ sơ để khách hàng theo dõi nếu chức năng được hỗ trợ.

Bước 2: Tiếp nhận và phân loại
Nhân sự có thẩm quyền kiểm tra nội dung, xác định phạm vi và chuyển cho bộ phận/phụ trách phù hợp.

Bước 3: Xác minh
Tùy vấn đề, SmartMush có thể kiểm tra:
- Lịch sử đơn hàng và thanh toán.
- Nhật ký chăm sóc và dữ liệu phiên trồng.
- Dữ liệu môi trường IoT.
- Hình ảnh, thông tin thu hoạch và bàn giao.
- Lịch sử vận chuyển và nội dung trao đổi liên quan.

SmartMush có thể liên hệ Farm Operator, Shipper hoặc bên liên quan khi cần xác minh. Khách hàng có thể được yêu cầu bổ sung thông tin.

Bước 4: Đề xuất phương án
Sau khi xác minh, phương án có thể gồm giải thích, điều chỉnh dữ liệu, hỗ trợ kỹ thuật, khắc phục sự cố, giao bổ sung, đổi sản phẩm, hoàn tiền hoặc biện pháp phù hợp khác theo chính sách liên quan.

Bước 5: Phản hồi
SmartMush thông báo kết quả, căn cứ và phương án được đề xuất. Nếu cần xác nhận hoặc thông tin bổ sung, nhân sự phụ trách sẽ hướng dẫn khách hàng.

Bước 6: Hoàn tất hoặc xem xét lại
Khi vấn đề được xử lý, hệ thống cập nhật trạng thái. Nếu khách hàng chưa đồng ý, khách hàng có thể yêu cầu xem xét lại và cung cấp căn cứ mới; hồ sơ sẽ được chuyển đến người có thẩm quyền đánh giá lại.

5. Thời gian xử lý
- Hệ thống ghi nhận khiếu nại khi yêu cầu được gửi thành công.
- Thời gian xử lý phụ thuộc loại vấn đề, tính đầy đủ của thông tin và mức độ phức tạp.
- Việc kiểm tra dữ liệu IoT, hoạt động trang trại, thanh toán hoặc vận chuyển bên thứ ba có thể cần thêm thời gian.
- Nếu việc xử lý kéo dài hơn dự kiến, SmartMush sẽ thông báo tình trạng hiện tại và lý do trong phạm vi có thể.
- Trường hợp khẩn cấp có nguy cơ đáng kể đến sản phẩm, giao dịch hoặc quyền lợi sẽ được ưu tiên kiểm tra.

SmartMush không cam kết thời hạn cố định nếu chưa xem xét yêu cầu cụ thể; mọi thời hạn quy định trong thỏa thuận hoặc thông báo riêng vẫn được áp dụng.

6. Khiếu nại lặp lại hoặc liên quan
- SmartMush kiểm tra lịch sử để tránh xử lý trùng một vấn đề.
- Khiếu nại cùng nguyên nhân có thể được liên kết để xem xét tổng thể.
- Vấn đề mới hoặc bằng chứng mới vẫn được tiếp nhận xem xét.
- Khi phát hiện nguyên nhân thuộc quy trình SmartMush, SmartMush xem xét biện pháp khắc phục và hạn chế tái diễn.
- Hành vi cố ý cung cấp thông tin sai hoặc lạm dụng có thể được xử lý theo điều khoản sử dụng, nhưng không được dùng để loại bỏ khiếu nại chính đáng.

7. Giải quyết tranh chấp
7.1. Trong hệ thống SmartMush
Các bên ưu tiên trao đổi và thương lượng; SmartMush tiếp nhận ý kiến, kiểm tra bằng chứng khách quan, đưa ra phương án theo dịch vụ và chính sách đã áp dụng.

7.2. Xem xét lại
Khách hàng có thể nêu phần chưa đồng ý và căn cứ liên quan. SmartMush chuyển hồ sơ đến người có thẩm quyền để đánh giá lại và thông báo kết quả.

7.3. Phương thức ngoài SmartMush
Nếu không đạt được thỏa thuận, khách hàng có quyền sử dụng cơ quan có thẩm quyền hoặc phương thức giải quyết tranh chấp khác theo pháp luật Việt Nam.

8. Bảo mật thông tin khiếu nại
- Thông tin cá nhân và nội dung khiếu nại chỉ dùng cho tiếp nhận, xác minh, giải quyết và cải thiện quy trình.
- Chỉ nhân sự có thẩm quyền và bên liên quan cần thiết được tiếp cận.
- Thông tin được bảo vệ theo Chính sách bảo mật và lưu trữ trong thời gian cần thiết để tra cứu, đối chiếu hoặc đáp ứng nghĩa vụ pháp lý.
- Không phương thức lưu trữ nào được mô tả là bảo mật tuyệt đối ngoài khả năng kỹ thuật và nghĩa vụ thực tế.

9. Điều khoản áp dụng
- Chính sách có hiệu lực kể từ khi được công bố trên hệ thống.
- SmartMush có thể cập nhật và thông báo những thay đổi quan trọng.
- Vấn đề chưa quy định được xử lý theo đơn hàng, các chính sách liên quan và pháp luật Việt Nam.
- Nếu chính sách khác với quy định pháp luật bắt buộc, quy định pháp luật được ưu tiên.

10. Thông tin liên hệ
- Đơn vị vận hành: SmartMush Farm
- Email hỗ trợ: Smartmush194@gmail.com
- Số điện thoại: 0379896749
- Địa chỉ: Cầu Vồng, Long Bình, TP. Thủ Đức, Hồ Chí Minh, Việt Nam
- Kênh hỗ trợ: Chức năng Khiếu nại/Hỗ trợ trên ứng dụng

Khi gửi yêu cầu, khách hàng nên cung cấp mã đơn hàng hoặc mùa vụ, mô tả vấn đề và bằng chứng liên quan.

SmartMush cam kết tiếp nhận và xử lý khiếu nại minh bạch, khách quan, tôn trọng quyền lợi hợp pháp của khách hàng và không né tránh trách nhiệm đối với vấn đề phát sinh từ dịch vụ do SmartMush cung cấp.`,
  },
];
