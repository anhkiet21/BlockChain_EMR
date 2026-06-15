from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "Tai_lieu_hoc_thuyet_trinh_Blockchain_EMR.docx"


def set_cell_border(cell, **edges):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_borders = tc_pr.first_child_found_in("w:tcBorders")
    if tc_borders is None:
        tc_borders = OxmlElement("w:tcBorders")
        tc_pr.append(tc_borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        if edge not in edges:
            continue
        edge_data = edges[edge]
        tag = "w:{}".format(edge)
        element = tc_borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            tc_borders.append(element)
        for key in ("val", "sz", "space", "color"):
            if key in edge_data:
                element.set(qn("w:{}".format(key)), str(edge_data[key]))


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("Trang ")
    run.font.size = Pt(9)
    field_begin = OxmlElement("w:fldChar")
    field_begin.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = "PAGE"
    field_end = OxmlElement("w:fldChar")
    field_end.set(qn("w:fldCharType"), "end")
    run._r.append(field_begin)
    run._r.append(instr_text)
    run._r.append(field_end)


def configure_document(doc):
    section = doc.sections[0]
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2.3)
    section.right_margin = Cm(2.3)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor(0, 0, 0)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.15

    heading_sizes = {
        "Title": 22,
        "Subtitle": 13,
        "Heading 1": 16,
        "Heading 2": 13,
        "Heading 3": 11,
    }
    for style_name, size in heading_sizes.items():
        style = styles[style_name]
        style.font.name = "Arial"
        style.font.size = Pt(size)
        style.font.bold = style_name != "Subtitle"
        style.font.color.rgb = RGBColor(0, 0, 0)
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")

    for section in doc.sections:
        add_page_number(section.footer.paragraphs[0])


def add_title_page(doc):
    for _ in range(4):
        doc.add_paragraph()
    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run("TÀI LIỆU HỌC VÀ THUYẾT TRÌNH\nHỆ THỐNG BLOCKCHAIN EMR")

    subtitle = doc.add_paragraph(style="Subtitle")
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.add_run(
        "Giải thích dễ hiểu về kiến trúc, blockchain, smart contract, luồng hoạt động, "
        "bảo mật và kịch bản demo"
    )

    doc.add_paragraph()
    info = doc.add_paragraph()
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    info.add_run("Họ tên: ............................................................\n")
    info.add_run("Lớp / Nhóm: .......................................................\n")
    info.add_run("Ngày thuyết trình: .................................................")

    doc.add_paragraph()
    note = doc.add_paragraph()
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    note.add_run(
        "Cách học: đọc phần 1-8 để hiểu hệ thống, luyện phần 12 để thuyết trình, "
        "xem phần 14 trước khi vào lớp."
    ).bold = True
    doc.add_page_break()


def add_heading(doc, text, level=1):
    return doc.add_heading(text, level=level)


def add_paragraph(doc, text="", bold_prefix=None):
    paragraph = doc.add_paragraph()
    if bold_prefix and text.startswith(bold_prefix):
        paragraph.add_run(bold_prefix).bold = True
        paragraph.add_run(text[len(bold_prefix):])
    else:
        paragraph.add_run(text)
    return paragraph


def add_bullets(doc, items, level=0):
    for item in items:
        paragraph = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
        paragraph.add_run(item)


def add_numbered(doc, items):
    for item in items:
        paragraph = doc.add_paragraph(style="List Number")
        paragraph.add_run(item)


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    header_cells = table.rows[0].cells
    for index, header in enumerate(headers):
        header_cells[index].text = header
        header_cells[index].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        for run in header_cells[index].paragraphs[0].runs:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 0, 0)

    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            cells[index].text = str(value)
            cells[index].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP

    border = {"val": "single", "sz": "6", "space": "0", "color": "000000"}
    for row in table.rows:
        for index, cell in enumerate(row.cells):
            set_cell_border(cell, top=border, bottom=border, left=border, right=border)
            if widths and index < len(widths):
                cell.width = Cm(widths[index])
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.space_after = Pt(2)
                for run in paragraph.runs:
                    run.font.name = "Arial"
                    run.font.size = Pt(9.5)
                    run.font.color.rgb = RGBColor(0, 0, 0)
    return table


def add_callout(doc, title, text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    border = {"val": "single", "sz": "10", "space": "0", "color": "000000"}
    set_cell_border(cell, top=border, bottom=border, left=border, right=border)
    paragraph = cell.paragraphs[0]
    paragraph.add_run(title + "\n").bold = True
    paragraph.add_run(text)
    doc.add_paragraph()


def build_document():
    doc = Document()
    configure_document(doc)
    add_title_page(doc)

    add_heading(doc, "Mục lục nội dung", 1)
    add_numbered(doc, [
        "Bản chất đề tài và câu giới thiệu ngắn",
        "Kiến thức nền: blockchain, ví, chữ ký số, transaction, hash, IPFS",
        "Kiến trúc tổng thể và vai trò từng công nghệ",
        "Smart contract của hệ thống hoạt động như thế nào",
        "Dữ liệu được lưu ở đâu và vì sao",
        "Các luồng nghiệp vụ chính từ đăng nhập đến hồ sơ bệnh án",
        "Các loại mã: recordId, onChainRecordId, transactionHash, CID, contentHash",
        "Bảo mật, quyền truy cập và nhật ký",
        "Những chức năng đã hoàn thiện và giới hạn hiện tại",
        "Kịch bản demo từng bước",
        "Bài nói mẫu 10-12 phút",
        "Câu hỏi phản biện và cách trả lời",
        "Từ điển thuật ngữ",
        "Tờ ôn nhanh một trang",
    ])

    add_heading(doc, "1. Hiểu đề tài trong 60 giây", 1)
    add_callout(
        doc,
        "Câu giới thiệu nên học thuộc:",
        "Đây là hệ thống quản lý hồ sơ bệnh án điện tử theo kiến trúc hybrid. "
        "MySQL quản lý tài khoản và nghiệp vụ, IPFS lưu tệp bệnh án đã mã hóa, "
        "còn blockchain lưu bằng chứng về quyền truy cập và tính toàn vẹn. "
        "Người dùng dùng MetaMask để chứng minh quyền sở hữu ví và ký các giao dịch cần sự đồng ý."
    )
    add_paragraph(
        doc,
        "EMR là viết tắt của Electronic Medical Record, nghĩa là hồ sơ bệnh án điện tử. "
        "Mục tiêu của đề tài không phải thay thế toàn bộ hệ thống bệnh viện, mà tập trung vào "
        "quản lý hồ sơ, kiểm soát quyền truy cập, theo dõi lịch sử và kiểm tra dữ liệu có bị thay đổi hay không."
    )
    add_heading(doc, "Vấn đề hệ thống muốn giải quyết", 2)
    add_bullets(doc, [
        "Hồ sơ y tế nhạy cảm nên không thể để bất kỳ bác sĩ hay bệnh viện nào cũng xem.",
        "Bệnh nhân cần biết ai đã truy cập và có quyền chủ động cấp hoặc thu hồi quyền.",
        "Cần phát hiện nếu tệp bệnh án bị thay đổi so với bằng chứng ban đầu.",
        "Cần có nhật ký khó sửa để đối chiếu giao dịch và trách nhiệm của người thực hiện.",
        "Không được đưa nội dung bệnh án và thông tin định danh cá nhân lên blockchain công khai.",
    ])
    add_heading(doc, "Ba ý quan trọng nhất", 2)
    add_numbered(doc, [
        "Blockchain không lưu toàn bộ bệnh án. Blockchain chỉ lưu bằng chứng tối thiểu.",
        "IPFS lưu tệp đã mã hóa; MySQL lưu metadata và trạng thái nghiệp vụ.",
        "Backend luôn kiểm tra quyền và xác minh giao dịch trước khi cập nhật dữ liệu chính thức.",
    ])

    add_heading(doc, "2. Kiến thức nền cần nắm", 1)
    add_heading(doc, "2.1 Blockchain là gì?", 2)
    add_paragraph(
        doc,
        "Blockchain là một sổ cái dữ liệu được nhiều nút mạng cùng duy trì. Dữ liệu mới được ghi thành "
        "các giao dịch và gom vào các khối. Mỗi khối liên kết với khối trước bằng mã băm, nên việc sửa dữ liệu "
        "cũ sẽ làm sai chuỗi liên kết và dễ bị phát hiện."
    )
    add_callout(
        doc,
        "Ví dụ dễ nhớ:",
        "Hãy tưởng tượng một cuốn sổ có rất nhiều bản sao. Mỗi khi ghi thêm một dòng, mọi bản sao đều xác nhận. "
        "Muốn lén sửa một dòng cũ thì phải sửa đồng thời tất cả bản sao và toàn bộ dấu niêm phong phía sau, "
        "nên khó hơn nhiều so với sửa một cơ sở dữ liệu do một máy chủ nắm giữ."
    )

    add_heading(doc, "2.2 Hash là gì?", 2)
    add_paragraph(
        doc,
        "Hash là kết quả của một hàm băm. Nó biến dữ liệu đầu vào thành một chuỗi có độ dài cố định. "
        "Chỉ cần nội dung thay đổi một ký tự thì hash thường thay đổi hoàn toàn. Hash không phải mã hóa và "
        "không thể dùng để khôi phục nội dung gốc."
    )
    add_bullets(doc, [
        "Trong đề tài, contentHash là SHA-256 của nội dung tệp gốc.",
        "Khi kiểm tra toàn vẹn, hệ thống tải và giải mã tệp, băm lại rồi so sánh với hash trên blockchain.",
        "Nếu hai hash giống nhau, có cơ sở kết luận nội dung chưa bị thay đổi.",
    ])

    add_heading(doc, "2.3 Ví blockchain, khóa và chữ ký số", 2)
    add_table(doc, ["Khái niệm", "Giải thích dễ hiểu"], [
        ("Địa chỉ ví", "Giống số tài khoản công khai. Có thể chia sẻ để nhận diện người ký."),
        ("Khóa riêng", "Giống mật khẩu tối cao của ví. Ai có khóa riêng có thể ký giao dịch. Không được đưa cho hệ thống."),
        ("Khóa công khai", "Được suy ra từ khóa riêng và dùng để kiểm tra chữ ký."),
        ("Chữ ký số", "Bằng chứng rằng chủ khóa riêng đã đồng ý với một thông điệp hoặc giao dịch."),
        ("MetaMask", "Ví chạy trên trình duyệt, quản lý tài khoản và yêu cầu người dùng xác nhận chữ ký."),
    ], [3.5, 12.5])
    add_paragraph(
        doc,
        "Backend không cần và không được giữ khóa riêng. Khi liên kết ví, backend tạo một nonce ngẫu nhiên. "
        "Người dùng ký thông điệp chứa nonce bằng MetaMask. Backend khôi phục địa chỉ từ chữ ký và chỉ lưu địa chỉ "
        "khi chữ ký hợp lệ."
    )

    add_heading(doc, "2.4 Kết nối ví khác với xác minh ví", 2)
    add_table(doc, ["Trạng thái", "Ý nghĩa"], [
        ("MetaMask đã kết nối", "Trình duyệt đang cho website nhìn thấy một địa chỉ ví."),
        ("Ví đã xác minh với tài khoản", "Backend đã kiểm tra chữ ký nonce và lưu ví thuộc về tài khoản."),
        ("Hai ví không khớp", "MetaMask đang chọn một ví khác với ví đã xác minh trong tài khoản."),
    ], [5, 11])
    add_callout(
        doc,
        "Điểm dễ bị hỏi:",
        "Chỉ kết nối MetaMask chưa đủ để ghi 'ví đã xác minh'. Phải ký nonce thành công và backend xác nhận "
        "quyền sở hữu. Giao diện cần hiển thị riêng trạng thái ví trong tài khoản và ví MetaMask hiện tại."
    )

    add_heading(doc, "2.5 Transaction và transactionHash", 2)
    add_paragraph(
        doc,
        "Transaction là yêu cầu thay đổi trạng thái blockchain, ví dụ cấp quyền hoặc tạo bằng chứng hồ sơ. "
        "Người dùng ký transaction, gửi đến mạng, chờ được đưa vào block và nhận receipt. TransactionHash là mã "
        "định danh duy nhất của giao dịch, giống số biên nhận để tra cứu và đối chiếu."
    )
    add_bullets(doc, [
        "Giao dịch đọc dữ liệu thường không làm thay đổi trạng thái và không cần transactionHash.",
        "Giao dịch ghi dữ liệu cần chữ ký, có thể thất bại và chỉ được coi là thành công khi receipt hợp lệ.",
        "Trong môi trường demo, Anvil là blockchain cục bộ nên không tốn tiền thật.",
    ])

    add_heading(doc, "2.6 Smart contract là gì?", 2)
    add_paragraph(
        doc,
        "Smart contract là chương trình được triển khai lên blockchain. Sau khi triển khai, nó có một địa chỉ contract. "
        "Mọi người gọi các hàm theo đúng quy tắc đã viết. Contract không tự suy nghĩ và không phải trí tuệ nhân tạo; "
        "nó chỉ thực thi điều kiện một cách xác định."
    )
    add_callout(
        doc,
        "Ví dụ dễ nhớ:",
        "Smart contract giống máy bán hàng tự động. Nếu người dùng đưa đúng điều kiện thì máy thực hiện đúng hành động. "
        "Không cần nhân viên đứng giữa quyết định từng lần, nhưng quy tắc của máy phải được lập trình chính xác."
    )

    add_heading(doc, "2.7 IPFS là gì?", 2)
    add_paragraph(
        doc,
        "IPFS là hệ thống lưu trữ theo nội dung. Sau khi đưa dữ liệu lên IPFS, ta nhận một CID. CID phụ thuộc vào nội dung; "
        "nội dung khác sẽ tạo CID khác. IPFS không tự bảo mật dữ liệu, vì vậy hệ thống mã hóa tệp bằng AES-256-GCM trước "
        "khi tải lên IPFS."
    )
    add_table(doc, ["Mã", "Nó định danh cái gì?", "Có phải bí mật không?"], [
        ("CID", "Đối tượng dữ liệu đã mã hóa trên IPFS", "Không. Nhưng nội dung phải được mã hóa."),
        ("contentHash", "Nội dung gốc để kiểm tra toàn vẹn", "Không thể khôi phục trực tiếp nội dung."),
        ("transactionHash", "Giao dịch trên blockchain", "Không."),
    ], [3, 8, 5])

    doc.add_page_break()
    add_heading(doc, "3. Kiến trúc tổng thể của hệ thống", 1)
    add_paragraph(doc, "Luồng tổng quát:")
    flow = doc.add_paragraph()
    flow.alignment = WD_ALIGN_PARAGRAPH.CENTER
    flow.add_run(
        "Người dùng → Trình duyệt Next.js + MetaMask → Nginx Gateway → Spring Boot Backend\n"
        "Backend ↔ MySQL | Backend ↔ IPFS | Backend ↔ Blockchain Anvil"
    ).bold = True
    add_table(doc, ["Thành phần", "Công nghệ", "Trách nhiệm"], [
        ("Frontend", "Next.js, React, TypeScript", "Hiển thị giao diện, gọi API, yêu cầu MetaMask ký."),
        ("Ví", "MetaMask, ethers.js", "Giữ khóa riêng phía người dùng và ký thông điệp/giao dịch."),
        ("Gateway", "Nginx", "Cung cấp một địa chỉ truy cập và chuyển tiếp đến frontend/backend."),
        ("Backend", "Java 17, Spring Boot, Spring Security", "Xử lý nghiệp vụ, JWT, quyền, kiểm tra giao dịch, audit."),
        ("Cơ sở dữ liệu", "MySQL, Flyway", "Lưu tài khoản, hồ sơ cá nhân, metadata, trạng thái và nhật ký."),
        ("Lưu trữ tệp", "Kubo IPFS", "Lưu ciphertext của tệp bệnh án."),
        ("Blockchain", "Solidity, Anvil, Web3j", "Lưu quyền facility và bằng chứng hồ sơ."),
        ("Triển khai", "Docker Compose", "Chạy các dịch vụ đồng nhất trong môi trường local."),
    ], [3.1, 4.2, 9])

    add_heading(doc, "Tại sao gọi là kiến trúc hybrid?", 2)
    add_paragraph(
        doc,
        "Hybrid nghĩa là kết hợp hệ thống tập trung và blockchain. Không phải mọi dữ liệu đều đưa lên blockchain. "
        "Phần cần truy vấn nhanh, chứa thông tin cá nhân hoặc cần cập nhật nghiệp vụ nằm trong MySQL. Phần cần bằng chứng "
        "khó sửa như quyền facility, CID và hash được ghi lên blockchain."
    )
    add_heading(doc, "Vai trò của backend", 2)
    add_bullets(doc, [
        "Xác thực JWT và kiểm tra vai trò ADMIN, DOCTOR, PATIENT.",
        "Đảm bảo người dùng chỉ thao tác trên dữ liệu thuộc quyền của mình.",
        "Mã hóa tệp trước khi gửi IPFS và giải mã khi người có quyền tải.",
        "Chuẩn bị nội dung giao dịch nhưng không tự ký thay người dùng.",
        "Sau giao dịch, kiểm tra receipt, người gửi, contract nhận, calldata, event và trạng thái on-chain.",
        "Chỉ xác nhận hồ sơ trong MySQL khi bằng chứng blockchain khớp.",
    ])

    add_heading(doc, "4. Dữ liệu được lưu ở đâu?", 1)
    add_table(doc, ["Nơi lưu", "Dữ liệu", "Lý do"], [
        ("MySQL", "Tài khoản, vai trò, hồ sơ bệnh nhân/bác sĩ, cơ sở y tế, yêu cầu quyền, emergency grant, metadata, audit.",
         "Truy vấn nhanh, có quan hệ, cập nhật nghiệp vụ thuận tiện."),
        ("IPFS", "Tệp bệnh án sau khi mã hóa AES-256-GCM.",
         "Tách nội dung tệp khỏi database và dùng CID theo nội dung."),
        ("Blockchain", "Trạng thái facility, quyền facility, CID, contentHash, ví bệnh nhân/tác giả, nguồn hồ sơ, thời gian.",
         "Tạo bằng chứng khó sửa và có thể đối chiếu độc lập."),
        ("MetaMask", "Khóa riêng của người dùng.",
         "Khóa riêng không được gửi cho backend."),
    ], [3, 8, 6])
    add_heading(doc, "Dữ liệu tuyệt đối không đưa lên blockchain", 2)
    add_bullets(doc, [
        "Nội dung bệnh án dạng rõ hoặc ciphertext đầy đủ.",
        "Họ tên, CCCD, ngày sinh, số điện thoại, địa chỉ.",
        "Chẩn đoán, đơn thuốc, kết quả xét nghiệm dạng rõ.",
        "Mật khẩu, JWT, refresh token, nonce, chữ ký MetaMask.",
        "Khóa AES và IV dùng để giải mã.",
    ])
    add_callout(
        doc,
        "Câu trả lời quan trọng:",
        "Blockchain có tính minh bạch và khó xóa nên không phù hợp để lưu dữ liệu y tế nhạy cảm. "
        "Đề tài chỉ đưa bằng chứng tối thiểu lên chuỗi, còn nội dung được mã hóa và lưu ngoài chuỗi."
    )

    add_heading(doc, "5. Smart contract MedicalRecordRegistry", 1)
    add_paragraph(
        doc,
        "Contract được viết bằng Solidity 0.8.28. Khi deploy, ví deployer trở thành owner. "
        "Owner chỉ quản lý trạng thái mã cơ sở y tế; bệnh nhân tự ký để cấp hoặc thu hồi quyền."
    )
    add_heading(doc, "5.1 Các biến trạng thái quan trọng", 2)
    add_table(doc, ["Tên", "Ý nghĩa"], [
        ("owner", "Ví triển khai contract; có quyền kích hoạt hoặc ngừng mã cơ sở."),
        ("activeFacilities[facilityId]", "Mã cơ sở nào đang hợp lệ trên blockchain."),
        ("facilityAccessGrants[patient][facilityId]", "Bệnh nhân đã cấp quyền cho cơ sở hay chưa."),
        ("records[recordId]", "CID, contentHash, ví bệnh nhân, tác giả, thời gian, phiên bản trước."),
        ("recordMetadata[recordId]", "Nguồn hồ sơ, ví tải lên và mã cơ sở."),
        ("successorRecordIds[recordId]", "Liên kết từ bản cũ đến bản đính chính mới."),
        ("nextRecordId", "Bộ đếm sinh mã hồ sơ on-chain tiếp theo."),
        ("accessGrants[patient][grantee]", "Quyền theo ví của luồng tương thích cũ."),
    ], [6, 11])

    add_heading(doc, "5.2 Struct Record chứa gì?", 2)
    add_table(doc, ["Trường", "Giải thích"], [
        ("cid", "Địa chỉ nội dung đã mã hóa trên IPFS."),
        ("contentHash", "SHA-256 của nội dung gốc."),
        ("patient", "Ví bệnh nhân sở hữu hồ sơ."),
        ("author", "Ví đã ký giao dịch tạo hồ sơ."),
        ("createdAt", "Thời gian block ghi hồ sơ."),
        ("previousRecordId", "Mã phiên bản trước, nếu đây là bản đính chính."),
    ], [5, 12])

    add_heading(doc, "5.3 Các hàm quan trọng", 2)
    add_table(doc, ["Hàm", "Ai gọi?", "Tác dụng"], [
        ("setFacilityStatus", "Owner", "Kích hoạt hoặc ngừng mã cơ sở y tế."),
        ("grantFacilityAccess", "Bệnh nhân", "Cấp quyền cho một facility đang hoạt động."),
        ("revokeFacilityAccess", "Bệnh nhân", "Thu hồi quyền facility."),
        ("hasFacilityAccess", "Đọc", "Kiểm tra quyền facility."),
        ("createRecordWithMetadata", "Bệnh nhân hoặc bác sĩ", "Tạo bằng chứng hồ sơ kèm nguồn và facility."),
        ("createRecordVersionWithMetadata", "Bác sĩ có quyền", "Tạo bản đính chính nối với bản trước."),
        ("getRecord", "Người có quyền", "Đọc bằng chứng hồ sơ."),
        ("getRecordMetadata", "Người có quyền", "Đọc nguồn hồ sơ và facility."),
        ("isLatestVersion", "Người có quyền", "Kiểm tra đây có phải phiên bản mới nhất."),
    ], [5.8, 3.5, 8])

    add_heading(doc, "5.4 Điều kiện khi tạo hồ sơ", 2)
    add_bullets(doc, [
        "Nếu bệnh nhân tự tải: người ký phải chính là ví bệnh nhân và facilityId phải rỗng.",
        "Nếu bác sĩ tải: facility phải đang hoạt động và bệnh nhân đã cấp quyền cho facility đó.",
        "CID không được rỗng và không vượt quá giới hạn.",
        "contentHash không được bằng 0.",
        "Mỗi bản đính chính chỉ có một bản kế tiếp để tránh tạo hai nhánh từ cùng một phiên bản.",
    ])

    add_heading(doc, "5.5 Event dùng để làm gì?", 2)
    add_paragraph(
        doc,
        "Event là bản ghi do contract phát ra khi một hành động xảy ra. Backend đọc event trong transaction receipt "
        "để xác minh giao dịch thực sự đã thực hiện đúng nội dung mong đợi."
    )
    add_bullets(doc, [
        "FacilityStatusChanged: trạng thái mã cơ sở thay đổi.",
        "FacilityAccessGranted / FacilityAccessRevoked: quyền facility được cấp hoặc thu hồi.",
        "RecordCreated: hồ sơ on-chain được tạo.",
        "RecordMetadataCreated: nguồn hồ sơ, ví tải và facility được ghi.",
        "RecordVersionCreated: một phiên bản đính chính được nối với bản trước.",
    ])

    add_heading(doc, "5.6 Smart contract không làm gì?", 2)
    add_bullets(doc, [
        "Không đăng nhập người dùng và không cấp JWT.",
        "Không lưu mật khẩu hoặc hồ sơ cá nhân.",
        "Không mã hóa hay giải mã tệp.",
        "Không tự biết ai là bác sĩ ngoài đời; việc xác thực bác sĩ thuộc backend/admin.",
        "Không thay thế MySQL và không thay thế toàn bộ hệ thống bệnh viện.",
    ])

    doc.add_page_break()
    add_heading(doc, "6. Các luồng hoạt động chính", 1)
    add_heading(doc, "6.1 Đăng ký và đăng nhập", 2)
    add_numbered(doc, [
        "Bệnh nhân đăng ký bằng CCCD/mã định danh và thông tin cá nhân.",
        "Bác sĩ đăng ký bằng mã định danh, giấy phép hành nghề và chọn cơ sở y tế.",
        "Backend băm mật khẩu và lưu tài khoản trong MySQL.",
        "Khi đăng nhập đúng, backend cấp access token và refresh token.",
        "Frontend gửi access token trong header Authorization khi gọi API.",
    ])
    add_paragraph(
        doc,
        "JWT chứng minh người dùng đã đăng nhập, nhưng không chứng minh họ sở hữu một ví blockchain. "
        "Vì vậy xác thực tài khoản và xác thực ví là hai bước riêng."
    )

    add_heading(doc, "6.2 Liên kết và xác minh ví", 2)
    add_numbered(doc, [
        "Người dùng bấm kết nối MetaMask.",
        "Frontend lấy địa chỉ ví hiện tại.",
        "Backend tạo nonce ngẫu nhiên gắn với user và địa chỉ ví.",
        "MetaMask yêu cầu người dùng ký thông điệp nonce.",
        "Backend khôi phục địa chỉ từ chữ ký.",
        "Nếu chữ ký đúng và ví chưa thuộc tài khoản khác, backend lưu địa chỉ ví.",
        "Bước này không tạo giao dịch blockchain và không tốn gas.",
    ])

    add_heading(doc, "6.3 Xác thực hoặc từ chối bác sĩ", 2)
    add_numbered(doc, [
        "Bác sĩ mới có trạng thái PENDING_VERIFICATION.",
        "Admin xem giấy phép, cơ sở công tác và trạng thái liên kết ví.",
        "Admin có thể xác thực hoặc từ chối và nhập lý do.",
        "Nếu từ chối, hồ sơ bác sĩ chuyển sang REJECTED; giao diện bác sĩ hiển thị lý do.",
        "Hệ thống ghi người duyệt, thời điểm, trạng thái trước/sau và lý do vào system audit.",
        "Bác sĩ có thể chỉnh sửa và gửi xác thực lại, trạng thái trở về PENDING_VERIFICATION.",
    ])
    add_callout(
        doc,
        "Không có transactionHash trong luồng này:",
        "Xác thực bác sĩ là nghiệp vụ trong MySQL, không phải giao dịch blockchain. Nhật ký vẫn phải có, "
        "nhưng cột mã giao dịch hiển thị 'Không áp dụng'."
    )

    add_heading(doc, "6.4 Bệnh nhân cấp quyền cho cơ sở y tế", 2)
    add_numbered(doc, [
        "Bác sĩ đã xác thực tìm bệnh nhân và gửi yêu cầu truy cập.",
        "Backend tự lấy facility từ hồ sơ bác sĩ, không tin facilityId tùy ý do frontend gửi.",
        "Bệnh nhân xem yêu cầu và chọn đồng ý hoặc từ chối.",
        "Nếu đồng ý, backend chuẩn bị calldata gọi grantFacilityAccess.",
        "MetaMask của bệnh nhân ký và gửi transaction.",
        "Backend kiểm tra receipt, người gửi, contract, calldata, event và trạng thái on-chain.",
        "Chỉ khi mọi thứ khớp, backend cập nhật grant trong MySQL và lưu transactionHash.",
    ])
    add_paragraph(
        doc,
        "Quyền được cấp cho cơ sở y tế thay vì riêng từng bác sĩ. Backend vẫn kiểm tra bác sĩ có thuộc facility đó, "
        "đã được xác thực và tài khoản còn hoạt động."
    )

    add_heading(doc, "6.5 Bệnh nhân thu hồi quyền", 2)
    add_numbered(doc, [
        "Bệnh nhân chọn thu hồi quyền facility.",
        "Backend chuẩn bị giao dịch revokeFacilityAccess.",
        "Bệnh nhân ký bằng MetaMask.",
        "Backend xác minh transaction và đồng bộ MySQL.",
        "Sau khi thu hồi, bác sĩ của facility không thể tiếp tục đọc hoặc tải hồ sơ theo quyền thông thường.",
    ])

    add_heading(doc, "6.6 Truy cập khẩn cấp", 2)
    add_numbered(doc, [
        "Bác sĩ đã xác thực nhập bệnh nhân, mã ca cấp cứu, lý do và thời hạn.",
        "Backend tạo emergency grant có thời điểm bắt đầu và hết hạn.",
        "Mỗi lần xem/tải theo quyền khẩn cấp phải được ghi nhật ký với bác sĩ, facility, lý do và mã ca.",
        "Trong thời gian còn hiệu lực, bệnh nhân vẫn có thể chủ động kết thúc quyền.",
        "Khi bệnh nhân kết thúc, hệ thống ghi endedAt, người kết thúc, lý do và system audit.",
        "Các lần truy cập tiếp theo phải bị chặn dù thời hạn ban đầu chưa hết.",
    ])
    add_callout(
        doc,
        "Bản chất quyền khẩn cấp:",
        "Đây là ngoại lệ nghiệp vụ có thời hạn ở backend, không phải cấp quyền facility lâu dài trên blockchain. "
        "Mục tiêu là xử lý cấp cứu nhưng vẫn có giới hạn và nhật ký trách nhiệm."
    )

    add_heading(doc, "6.7 Bệnh nhân tự tải hồ sơ", 2)
    add_numbered(doc, [
        "Frontend gửi tệp đến backend.",
        "Backend kiểm tra loại tệp, kích thước và quyền người dùng.",
        "Backend tính SHA-256 của nội dung gốc.",
        "Backend mã hóa tệp bằng AES-256-GCM.",
        "Ciphertext được tải lên IPFS và nhận CID.",
        "Backend trả thông tin pending gồm medicalFileId, CID, hash và các ví liên quan.",
        "MetaMask bệnh nhân ký createRecordWithMetadata với nguồn PATIENT_UPLOADED.",
        "Backend xác minh transaction và dữ liệu on-chain.",
        "Nếu đúng, backend tạo record chính thức trong MySQL.",
    ])

    add_heading(doc, "6.8 Bác sĩ tải hồ sơ cho bệnh nhân", 2)
    add_numbered(doc, [
        "Backend kiểm tra bác sĩ đã xác thực, facility hoạt động và có ví.",
        "Kiểm tra bệnh nhân có ví và facility đang có quyền.",
        "Kiểm tra quyền trong MySQL và trên blockchain.",
        "Tệp được băm, mã hóa và tải lên IPFS.",
        "Bác sĩ ký giao dịch tạo hồ sơ với nguồn DOCTOR_UPLOADED và facilityId.",
        "Backend chỉ xác nhận record khi transaction, event và dữ liệu contract đều khớp.",
    ])

    add_heading(doc, "6.9 Đính chính hồ sơ", 2)
    add_paragraph(
        doc,
        "Hồ sơ cũ không bị sửa trực tiếp. Bác sĩ tạo một phiên bản mới và chỉ ra previousRecordId. "
        "Contract lưu liên kết phiên bản. Cách này giữ lịch sử, biết bản nào là bản cũ và bản nào đang hiện hành."
    )

    add_heading(doc, "6.10 Kiểm tra toàn vẹn", 2)
    add_numbered(doc, [
        "Đọc metadata trong MySQL.",
        "Đọc record tương ứng trên blockchain.",
        "Tải ciphertext từ IPFS và giải mã.",
        "Tính lại SHA-256 của nội dung.",
        "So sánh CID và hash giữa MySQL, IPFS và blockchain.",
        "Chỉ báo toàn vẹn khi các giá trị cần thiết đều khớp.",
    ])

    add_heading(doc, "7. Hiểu đúng các loại mã", 1)
    add_table(doc, ["Tên mã", "Nơi sinh", "Dùng để làm gì?", "Hiển thị ở đâu?"], [
        ("recordId", "MySQL/backend", "Khóa chính của hồ sơ trong nghiệp vụ và API.", "Chi tiết hồ sơ, danh sách, audit admin."),
        ("onChainRecordId", "Smart contract", "Vị trí record trong mapping records trên blockchain.", "Chi tiết hồ sơ, trang kiểm tra blockchain, audit."),
        ("transactionHash", "Blockchain", "Mã biên nhận giao dịch tạo/cấp/thu hồi.", "Chi tiết hồ sơ và nhật ký admin."),
        ("CID", "IPFS", "Định danh ciphertext trên IPFS.", "Chi tiết hồ sơ, kiểm tra toàn vẹn."),
        ("contentHash", "Backend SHA-256", "Dấu vân tay của nội dung gốc.", "Chi tiết hồ sơ, kiểm tra toàn vẹn."),
        ("medicalFileId", "MySQL/backend", "Mã tệp pending trước khi xác nhận on-chain.", "Chủ yếu dùng nội bộ trong bước upload/confirm."),
        ("facilityId", "Danh mục hệ thống", "Mã cơ sở y tế, ví dụ BV001.", "Đăng ký bác sĩ, quyền, audit, contract."),
    ], [3.2, 3, 6.2, 5.3])
    add_callout(
        doc,
        "Trả lời câu 'recordId lấy ở đâu?':",
        "Không cần vào MySQL. Backend trả recordId qua API danh sách/chi tiết hồ sơ. Giao diện hiển thị recordId, "
        "onChainRecordId, transactionHash, CID và contentHash trong phần 'Xem mã hồ sơ'."
    )
    add_heading(doc, "Vì sao có hai mã hồ sơ?", 2)
    add_paragraph(
        doc,
        "recordId thuộc thế giới nghiệp vụ trong MySQL, còn onChainRecordId thuộc smart contract. "
        "Hai hệ thống có bộ đếm riêng nên không nên giả định hai số luôn giống nhau. Backend lưu liên kết giữa chúng."
    )

    add_heading(doc, "8. Bảo mật và kiểm soát quyền", 1)
    add_table(doc, ["Lớp bảo vệ", "Cơ chế"], [
        ("Tài khoản", "Mật khẩu được băm; đăng nhập cấp JWT thời hạn ngắn và refresh token."),
        ("Vai trò", "Spring Security kiểm tra ADMIN, DOCTOR, PATIENT ở API."),
        ("Sở hữu dữ liệu", "API kiểm tra userId từ token và patient/doctor profile tương ứng."),
        ("Sở hữu ví", "Nonce + chữ ký MetaMask; backend không giữ khóa riêng."),
        ("Nội dung tệp", "AES-256-GCM trước khi tải IPFS."),
        ("Toàn vẹn", "SHA-256 đối chiếu với bằng chứng trên blockchain."),
        ("Giao dịch", "Kiểm tra receipt, from, to, calldata, event và trạng thái sau giao dịch."),
        ("Audit", "Ghi người thực hiện, đối tượng, lý do, trạng thái, thời gian và transactionHash nếu có."),
        ("IDOR", "Không chỉ dựa vào ID trên URL; backend phải kiểm tra tài nguyên thuộc người dùng."),
    ], [4, 13])

    add_heading(doc, "Nguyên tắc backend không tin frontend", 2)
    add_bullets(doc, [
        "Không tin role hoặc userId do trình duyệt tự gửi.",
        "Không tin facilityId tùy ý của bác sĩ; lấy facility từ hồ sơ đã lưu.",
        "Không tin transactionHash là đủ; phải đọc giao dịch và event để xác minh.",
        "Không tin MetaMask đang kết nối nghĩa là ví đã thuộc tài khoản.",
        "Không trả dữ liệu nhạy cảm chỉ vì người dùng biết recordId.",
    ])

    add_heading(doc, "9. Nhật ký hệ thống và đối chiếu mã cơ sở", 1)
    add_heading(doc, "Nhật ký quản trị ghi gì?", 2)
    add_bullets(doc, [
        "Duyệt hoặc từ chối bác sĩ, gồm người thực hiện, lý do và trạng thái trước/sau.",
        "Khóa hoặc mở khóa tài khoản.",
        "Bệnh nhân kết thúc quyền khẩn cấp.",
        "Cấp và thu hồi quyền facility có transactionHash.",
        "Tạo hồ sơ có recordId, onChainRecordId, CID, hash và transactionHash.",
    ])
    add_paragraph(
        doc,
        "Không phải sự kiện nào cũng có transactionHash. Chỉ hành động thực sự ghi blockchain mới có mã giao dịch. "
        "Hành động thuần nghiệp vụ trong database phải hiển thị 'Không áp dụng' thay vì giả tạo một mã."
    )

    add_heading(doc, "Đối chiếu mã bệnh viện", 2)
    add_paragraph(
        doc,
        "Danh mục facility tồn tại trong MySQL và trạng thái activeFacilities tồn tại trên contract. "
        "Admin có màn hình so sánh từng facilityId giữa hai nguồn. Trạng thái 'Đã đồng bộ' nghĩa là active trong "
        "database và blockchain khớp nhau. Nếu contract không truy cập được thì phải báo 'Blockchain lỗi', "
        "không được tự coi là đồng bộ."
    )

    add_heading(doc, "10. Chức năng hiện tại và giới hạn cần nói thật", 1)
    add_heading(doc, "Đã có trong hệ thống", 2)
    add_bullets(doc, [
        "Đăng ký/đăng nhập bệnh nhân và bác sĩ; tài khoản admin dùng email.",
        "Liên kết ví bằng nonce và chữ ký MetaMask.",
        "Admin xác thực/từ chối bác sĩ, lưu lý do và audit.",
        "Kiểm tra mã facility giữa MySQL và blockchain.",
        "Bệnh nhân cấp/thu hồi quyền facility.",
        "Bác sĩ gửi yêu cầu truy cập và có luồng khẩn cấp.",
        "Bệnh nhân có thể kết thúc quyền khẩn cấp trước hạn.",
        "Tệp bệnh án được mã hóa, lưu IPFS và có bằng chứng blockchain.",
        "Hiển thị recordId, onChainRecordId, transactionHash, CID và contentHash.",
        "Kiểm tra toàn vẹn và theo dõi phiên bản đính chính.",
    ])
    add_heading(doc, "Giới hạn hiện tại", 2)
    add_bullets(doc, [
        "Đây là đồ án/demo, chưa phải hệ thống HIS hoàn chỉnh và chưa sẵn sàng vận hành bệnh viện thật.",
        "Blockchain đang dùng Anvil local; triển khai thực tế cần chọn mạng permissioned hoặc hạ tầng phù hợp.",
        "Owner contract có quyền quản lý facility nên mô hình quản trị vẫn có yếu tố tập trung.",
        "Khôi phục ví, quản lý khóa, sao lưu IPFS và quy trình pháp lý cần thiết kế sâu hơn cho production.",
        "Một người đồng thời có role DOCTOR và PATIENT chưa được hoàn thiện trong đợt chức năng này.",
        "Chưa tích hợp VNeID hoặc cơ sở dữ liệu dân cư thật; mã định danh chỉ phục vụ mô phỏng.",
    ])
    add_callout(
        doc,
        "Nếu bị hỏi bác sĩ cũng là bệnh nhân:",
        "Về thiết kế, một user có thể có nhiều role và hai profile riêng. Khi thao tác bệnh án cá nhân thì dùng quyền PATIENT; "
        "khi khám cho người khác thì dùng quyền DOCTOR. Tuy nhiên giao diện và quy tắc chuyển ngữ cảnh cho trường hợp hai role "
        "đang được để lại cho giai đoạn tiếp theo, nên không nên tuyên bố đã hoàn thiện."
    )

    doc.add_page_break()
    add_heading(doc, "11. Kịch bản demo đề xuất", 1)
    add_paragraph(
        doc,
        "Không demo lan man. Mỗi thao tác phải gắn với một ý kiến trúc hoặc bảo mật. "
        "Chuẩn bị sẵn ba tài khoản patient, doctor, admin và mạng Anvil trong MetaMask."
    )
    add_heading(doc, "Demo 1: Xác minh ví đúng bản chất", 2)
    add_numbered(doc, [
        "Đăng nhập bệnh nhân và mở trang hồ sơ.",
        "Chỉ ra trạng thái 'Chưa liên kết ví'.",
        "Kết nối MetaMask nhưng giải thích đây mới là kết nối trình duyệt.",
        "Ký nonce và chờ backend xác minh.",
        "Chỉ khi API thành công, trạng thái mới đổi thành ví đã xác minh.",
    ])
    add_paragraph(
        doc,
        "Câu nói: 'Hệ thống tách địa chỉ MetaMask đang kết nối và địa chỉ đã được backend xác minh để tránh hiển thị sai quyền sở hữu ví.'"
    )

    add_heading(doc, "Demo 2: Admin từ chối bác sĩ và audit", 2)
    add_numbered(doc, [
        "Đăng nhập admin, mở danh sách bác sĩ chờ xác thực.",
        "Chọn từ chối và nhập lý do.",
        "Đăng nhập bác sĩ, cho thấy trạng thái REJECTED và lý do.",
        "Mở nhật ký quản trị, tìm sự kiện 'Từ chối bác sĩ'.",
        "Chỉ ra người thực hiện, đối tượng, lý do, trạng thái và 'Không áp dụng' ở mã giao dịch.",
    ])
    add_paragraph(
        doc,
        "Câu nói: 'Đây là nghiệp vụ database nên không có transactionHash, nhưng vẫn bắt buộc có audit để truy trách nhiệm.'"
    )

    add_heading(doc, "Demo 3: Đối chiếu mã bệnh viện", 2)
    add_numbered(doc, [
        "Mở tab cơ sở y tế.",
        "Chọn BV001.",
        "Chỉ trạng thái Database và Blockchain.",
        "Giải thích chỉ khi hai nguồn khớp mới hiện 'Đã đồng bộ'.",
    ])

    add_heading(doc, "Demo 4: Quyền khẩn cấp và bệnh nhân chủ động kết thúc", 2)
    add_numbered(doc, [
        "Bác sĩ tạo quyền khẩn cấp có mã ca, lý do và thời hạn.",
        "Đăng nhập bệnh nhân và mở nhật ký khẩn cấp.",
        "Chỉ trạng thái còn hiệu lực.",
        "Bệnh nhân bấm kết thúc, nhập lý do.",
        "Làm mới và chỉ trạng thái 'Đã kết thúc', endedAt và lý do.",
        "Mở audit admin để chứng minh sự kiện được lưu.",
    ])

    add_heading(doc, "Demo 5: Các mã hồ sơ", 2)
    add_numbered(doc, [
        "Mở hồ sơ bệnh nhân và bấm 'Xem mã hồ sơ'.",
        "Giải thích recordId là mã MySQL/API.",
        "Giải thích onChainRecordId là mã trong smart contract.",
        "Giải thích transactionHash là biên nhận giao dịch.",
        "Giải thích CID là địa chỉ ciphertext trên IPFS.",
        "Giải thích contentHash dùng kiểm tra toàn vẹn.",
        "Nhấn kiểm tra blockchain hoặc kiểm tra toàn vẹn để minh họa đối chiếu.",
    ])

    add_heading(doc, "Trình tự demo an toàn", 2)
    add_bullets(doc, [
        "Mở sẵn các tab và đăng nhập thử trước giờ trình bày.",
        "Kiểm tra backend health, IPFS và Anvil đang chạy.",
        "Kiểm tra MetaMask đúng chain ID 31337 và đúng ví.",
        "Dùng tệp nhỏ, tên dễ nhận biết.",
        "Nếu giao dịch chậm, giải thích bước đang chờ block/receipt thay vì bấm lặp.",
        "Không nhập khóa riêng hoặc bí mật lên màn hình.",
    ])

    add_heading(doc, "12. Bài nói mẫu 10-12 phút", 1)
    add_heading(doc, "Mở đầu - khoảng 1 phút", 2)
    add_paragraph(
        doc,
        "Xin chào thầy/cô và các bạn. Đề tài của em là hệ thống quản lý hồ sơ bệnh án điện tử ứng dụng blockchain. "
        "Vấn đề em tập trung giải quyết là dữ liệu y tế rất nhạy cảm, bệnh nhân cần kiểm soát quyền truy cập, "
        "và hệ thống cần chứng minh hồ sơ không bị thay đổi. Giải pháp của em không đưa toàn bộ bệnh án lên blockchain, "
        "mà sử dụng kiến trúc hybrid giữa MySQL, IPFS và smart contract."
    )

    add_heading(doc, "Kiến trúc - khoảng 2 phút", 2)
    add_paragraph(
        doc,
        "Frontend được xây bằng Next.js và giao tiếp với MetaMask. Backend dùng Spring Boot, Spring Security và JWT "
        "để xử lý tài khoản, vai trò và nghiệp vụ. MySQL lưu hồ sơ cá nhân, trạng thái và nhật ký. "
        "Tệp bệnh án được mã hóa AES-256-GCM trước khi lưu trên IPFS. Blockchain chỉ lưu CID, hash, ví liên quan, "
        "mã cơ sở và quyền truy cập. Nginx làm gateway và toàn bộ môi trường được chạy bằng Docker Compose."
    )

    add_heading(doc, "Blockchain và smart contract - khoảng 2 phút", 2)
    add_paragraph(
        doc,
        "Smart contract có thể hiểu là chương trình chạy trên blockchain. Contract của em tên MedicalRecordRegistry. "
        "Nó quản lý mã cơ sở đang hoạt động, quyền bệnh nhân cấp cho cơ sở và bằng chứng của từng hồ sơ. "
        "Khi tạo hồ sơ, contract lưu CID, contentHash, ví bệnh nhân, ví tác giả, thời gian và phiên bản trước. "
        "Contract không lưu họ tên, CCCD hay nội dung bệnh án vì dữ liệu blockchain khó xóa và có tính công khai."
    )

    add_heading(doc, "Luồng quyền và hồ sơ - khoảng 3 phút", 2)
    add_paragraph(
        doc,
        "Bác sĩ đăng ký sẽ ở trạng thái chờ xác thực. Admin có thể duyệt hoặc từ chối và mọi hành động được lưu audit. "
        "Người dùng liên kết ví bằng cách ký nonce; backend kiểm tra chữ ký chứ không giữ khóa riêng. "
        "Khi bệnh nhân đồng ý cấp quyền, MetaMask ký giao dịch grantFacilityAccess. Backend không chỉ nhận transactionHash "
        "mà còn kiểm tra receipt, người gửi, contract, calldata, event và trạng thái cuối. "
        "Khi tải hồ sơ, backend băm và mã hóa tệp, tải ciphertext lên IPFS, sau đó người dùng ký giao dịch tạo record. "
        "Chỉ khi bằng chứng on-chain khớp thì hồ sơ mới được xác nhận trong MySQL."
    )

    add_heading(doc, "Điểm nổi bật - khoảng 2 phút", 2)
    add_paragraph(
        doc,
        "Hệ thống phân biệt ví MetaMask đang kết nối với ví đã xác minh. Admin có thể đối chiếu mã bệnh viện giữa "
        "database và blockchain. Bệnh nhân có thể kết thúc quyền khẩn cấp ngay cả khi thời hạn chưa hết. "
        "Giao diện hiển thị rõ recordId, onChainRecordId, transactionHash, CID và contentHash nên không cần truy cập MySQL "
        "để lấy mã. Nhật ký cũng phân biệt sự kiện có giao dịch blockchain và sự kiện database không có transactionHash."
    )

    add_heading(doc, "Kết luận - khoảng 1 phút", 2)
    add_paragraph(
        doc,
        "Kết quả của đề tài là một mô hình quản lý hồ sơ bệnh án có phân quyền, mã hóa nội dung và bằng chứng toàn vẹn. "
        "Điểm chính không phải dùng blockchain cho mọi thứ, mà dùng đúng nơi cần bằng chứng khó sửa, còn dữ liệu nhạy cảm "
        "vẫn được bảo vệ ngoài chuỗi. Hệ thống hiện là bản demo và cần bổ sung quản trị khóa, hạ tầng production, pháp lý "
        "và trường hợp đa vai trò trước khi ứng dụng thực tế."
    )

    doc.add_page_break()
    add_heading(doc, "13. Câu hỏi phản biện thường gặp", 1)
    qa = [
        ("1. Tại sao phải dùng blockchain, MySQL không đủ sao?",
         "MySQL vẫn cần cho nghiệp vụ. Blockchain được dùng để tạo bằng chứng khó sửa về quyền và toàn vẹn. "
         "Nếu chỉ dùng MySQL, quản trị cơ sở dữ liệu có thể sửa cả dữ liệu lẫn nhật ký trong cùng một nơi."),
        ("2. Tại sao không lưu toàn bộ bệnh án lên blockchain?",
         "Vì bệnh án nhạy cảm, dung lượng lớn, tốn chi phí, khó xóa và blockchain có tính minh bạch. "
         "Chỉ CID, hash và metadata tối thiểu được đưa lên chuỗi."),
        ("3. IPFS có bảo mật không?",
         "IPFS là cơ chế lưu trữ theo nội dung, không tự đảm bảo bí mật. Hệ thống mã hóa AES-256-GCM trước khi tải lên IPFS."),
        ("4. CID và contentHash khác nhau thế nào?",
         "CID định danh đối tượng ciphertext trên IPFS; contentHash là SHA-256 của nội dung gốc để kiểm tra toàn vẹn."),
        ("5. Hash có giải mã được không?",
         "Không. Hash là hàm một chiều, dùng so sánh chứ không dùng khôi phục nội dung."),
        ("6. Backend có giữ khóa riêng không?",
         "Không. Khóa riêng nằm trong MetaMask. Backend chỉ nhận địa chỉ, chữ ký và transactionHash."),
        ("7. Kết nối MetaMask có nghĩa là đã xác minh ví chưa?",
         "Chưa. Phải ký nonce và được backend xác minh chữ ký thì ví mới được liên kết với tài khoản."),
        ("8. recordId lấy ở đâu?",
         "API trả về recordId. Giao diện hiển thị trong phần xem mã hồ sơ, không cần vào MySQL."),
        ("9. onChainRecordId khác recordId ra sao?",
         "recordId là mã nghiệp vụ trong MySQL; onChainRecordId là mã do bộ đếm của smart contract sinh ra."),
        ("10. transactionHash dùng để làm gì?",
         "Dùng tra cứu giao dịch và đối chiếu ai gửi, gọi contract nào, dữ liệu gì, thành công hay thất bại."),
        ("11. Admin từ chối bác sĩ có transactionHash không?",
         "Không, vì đây là thay đổi database. Hệ thống ghi system audit và hiển thị 'Không áp dụng' cho mã giao dịch."),
        ("12. Ai được xác thực bác sĩ?",
         "Tài khoản ADMIN. Hệ thống ghi admin user ID, tên, thời gian, lý do và trạng thái trước/sau."),
        ("13. Bệnh nhân cấp quyền cho bác sĩ hay bệnh viện?",
         "Luồng chính cấp quyền theo facility. Backend kiểm tra bác sĩ đang thuộc facility đó và đã được xác thực."),
        ("14. Bác sĩ đổi bệnh viện thì sao?",
         "Cần cập nhật facility và đưa hồ sơ bác sĩ về quy trình xem xét lại. Đây là quy tắc nghiệp vụ cần được quản lý chặt."),
        ("15. Bệnh nhân có thể dừng quyền khẩn cấp trước hạn không?",
         "Có. Backend đặt endedAt và chặn lần truy cập tiếp theo, đồng thời lưu người kết thúc và lý do."),
        ("16. Quyền khẩn cấp có ghi blockchain không?",
         "Trong thiết kế hiện tại, đó là quyền ngoại lệ có thời hạn ở backend và có audit, không phải quyền facility lâu dài on-chain."),
        ("17. Nếu người dùng đưa transactionHash giả thì sao?",
         "Backend đọc transaction thật và kiểm tra receipt, from, to, calldata, event cùng trạng thái on-chain; hash giả hoặc giao dịch khác sẽ bị từ chối."),
        ("18. Nếu tệp trên IPFS bị thay đổi thì sao?",
         "Nội dung khác sẽ có CID/hash khác. Khi kiểm tra toàn vẹn, hệ thống so sánh lại với bằng chứng blockchain và phát hiện lệch."),
        ("19. Blockchain có xóa được hồ sơ không?",
         "Bằng chứng đã ghi không bị xóa theo cách thông thường. Hệ thống dùng phiên bản đính chính thay vì sửa record cũ."),
        ("20. Ai quản lý mã bệnh viện trên contract?",
         "Owner của contract kích hoạt hoặc ngừng facility. Admin có màn hình đối chiếu trạng thái MySQL và blockchain."),
        ("21. Đây có phải hệ thống phi tập trung hoàn toàn không?",
         "Không. Đây là kiến trúc hybrid. Backend, MySQL và owner contract vẫn là thành phần quản trị tập trung."),
        ("22. Anvil là gì?",
         "Anvil là blockchain Ethereum cục bộ phục vụ phát triển và demo, có chain ID 31337 và không dùng tiền thật."),
        ("23. Gas là gì?",
         "Gas là chi phí tính toán khi ghi giao dịch lên mạng Ethereum. Trong Anvil local chỉ là mô phỏng."),
        ("24. Nếu mất ví thì sao?",
         "Bản demo chưa hoàn thiện quy trình khôi phục. Production cần chính sách đổi ví, xác minh danh tính và thu hồi ví cũ có audit."),
        ("25. Bác sĩ cũng là bệnh nhân thì sao?",
         "Thiết kế đúng là một user có hai role và hai ngữ cảnh. Chức năng chuyển ngữ cảnh đa vai trò chưa hoàn thiện trong đợt này."),
        ("26. Hệ thống có tuân thủ pháp luật y tế chưa?",
         "Chưa thể khẳng định. Đây là demo kỹ thuật; triển khai thật cần đánh giá pháp lý, bảo mật, lưu trữ, đồng thuận và kiểm toán."),
        ("27. Điểm mới của đề tài là gì?",
         "Kết hợp phân quyền theo facility, chữ ký ví, mã hóa IPFS, bằng chứng blockchain, đối chiếu transaction và audit nghiệp vụ trong một luồng thống nhất."),
    ]
    for question, answer in qa:
        paragraph = doc.add_paragraph()
        paragraph.add_run(question).bold = True
        paragraph = doc.add_paragraph()
        paragraph.add_run("Trả lời: ").bold = True
        paragraph.add_run(answer)

    add_heading(doc, "14. Từ điển thuật ngữ", 1)
    add_table(doc, ["Thuật ngữ", "Cách hiểu ngắn"], [
        ("EMR", "Hồ sơ bệnh án điện tử."),
        ("Blockchain", "Sổ cái phân tán, dữ liệu ghi theo giao dịch và khó sửa."),
        ("Smart contract", "Chương trình chạy trên blockchain."),
        ("Wallet", "Công cụ quản lý khóa và ký."),
        ("Address", "Địa chỉ công khai của ví."),
        ("Private key", "Khóa bí mật dùng ký; không được chia sẻ."),
        ("Signature", "Chữ ký chứng minh chủ ví đồng ý."),
        ("Nonce", "Giá trị dùng một lần để chống phát lại chữ ký."),
        ("Transaction", "Yêu cầu thay đổi trạng thái blockchain."),
        ("Receipt", "Kết quả giao dịch sau khi được xử lý."),
        ("Transaction hash", "Mã định danh giao dịch."),
        ("Block", "Nhóm giao dịch được ghi vào chuỗi."),
        ("Gas", "Chi phí tính toán giao dịch."),
        ("RPC", "Cổng để ứng dụng giao tiếp với node blockchain."),
        ("Anvil", "Blockchain Ethereum local dùng demo."),
        ("Solidity", "Ngôn ngữ viết smart contract Ethereum."),
        ("Web3j", "Thư viện Java giao tiếp Ethereum."),
        ("ethers.js", "Thư viện JavaScript giao tiếp ví và Ethereum."),
        ("IPFS", "Lưu trữ phân tán theo nội dung."),
        ("CID", "Mã định danh nội dung trên IPFS."),
        ("Hash", "Dấu vân tay một chiều của dữ liệu."),
        ("SHA-256", "Thuật toán băm dùng cho contentHash."),
        ("AES-256-GCM", "Thuật toán mã hóa đối xứng có kiểm tra toàn vẹn."),
        ("JWT", "Token chứng minh phiên đăng nhập."),
        ("RBAC", "Phân quyền theo vai trò."),
        ("Audit log", "Nhật ký ai làm gì, với đối tượng nào và khi nào."),
        ("On-chain", "Dữ liệu hoặc hành động trên blockchain."),
        ("Off-chain", "Dữ liệu hoặc hành động ngoài blockchain."),
        ("Hybrid", "Kết hợp on-chain và off-chain."),
    ], [5, 12])

    doc.add_page_break()
    add_heading(doc, "15. Tờ ôn nhanh trước khi thuyết trình", 1)
    add_callout(
        doc,
        "Một câu mô tả:",
        "MySQL quản lý nghiệp vụ, IPFS giữ tệp đã mã hóa, blockchain giữ bằng chứng, MetaMask giữ khóa và ký."
    )
    add_heading(doc, "Năm câu phải nhớ", 2)
    add_numbered(doc, [
        "Không lưu nội dung bệnh án hoặc PII lên blockchain.",
        "Kết nối MetaMask chưa phải xác minh ví; phải ký nonce.",
        "Backend không tin transactionHash, mà xác minh toàn bộ giao dịch và event.",
        "recordId thuộc MySQL; onChainRecordId thuộc smart contract.",
        "Audit database không nhất thiết có transactionHash; chỉ sự kiện on-chain mới có.",
    ])
    add_heading(doc, "Năm công nghệ chính", 2)
    add_bullets(doc, [
        "Next.js/React: giao diện.",
        "Spring Boot/Security/JWT: API, nghiệp vụ, xác thực và phân quyền.",
        "MySQL/Flyway: dữ liệu nghiệp vụ và migration.",
        "IPFS + AES-256-GCM: lưu tệp đã mã hóa.",
        "Solidity/Anvil/MetaMask/Web3j/ethers.js: blockchain và chữ ký.",
    ])
    add_heading(doc, "Năm bước upload hồ sơ", 2)
    add_paragraph(
        doc,
        "Kiểm tra quyền → băm nội dung → mã hóa và lưu IPFS → người dùng ký giao dịch → backend xác minh rồi mới xác nhận MySQL."
    )
    add_heading(doc, "Năm loại mã", 2)
    add_paragraph(
        doc,
        "recordId = mã DB; onChainRecordId = mã contract; transactionHash = biên nhận giao dịch; "
        "CID = địa chỉ IPFS; contentHash = dấu vân tay nội dung."
    )
    add_heading(doc, "Câu kết", 2)
    add_paragraph(
        doc,
        "Giá trị của đề tài không nằm ở việc đưa mọi thứ lên blockchain, mà ở việc chọn đúng dữ liệu cần bằng chứng "
        "khó sửa, trong khi vẫn bảo vệ nội dung y tế nhạy cảm bằng mã hóa và kiểm soát quyền ở backend."
    )

    add_heading(doc, "Checklist trước khi vào thuyết trình", 2)
    add_bullets(doc, [
        "Nói thử bài 10 phút ít nhất hai lần và tự bấm giờ.",
        "Mở file này ở phần 15 để ôn nhanh.",
        "Kiểm tra Docker, backend health, Anvil, IPFS và MetaMask.",
        "Chuẩn bị một tệp JSON/PDF nhỏ để demo.",
        "Không học thuộc từng chữ; nhớ cấu trúc: vấn đề → kiến trúc → luồng → bảo mật → demo → giới hạn.",
        "Khi không chắc, nói rõ phạm vi demo và hướng phát triển thay vì đoán.",
    ])

    doc.add_paragraph()
    ending = doc.add_paragraph()
    ending.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ending.add_run("HẾT").bold = True

    doc.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    path = build_document()
    print(path)
