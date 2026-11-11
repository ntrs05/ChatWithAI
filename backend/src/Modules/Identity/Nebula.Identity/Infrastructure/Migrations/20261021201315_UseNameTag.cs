using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nebula.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UseNameTag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_identity_users_UserCode",
                table: "identity_users");

            // ID cũ (8 chữ số, duy nhất toàn hệ thống) → ID mới 4 chữ số 0000–9999, chỉ cần duy nhất trong CÙNG MỘT TÊN HIỂN THỊ.
            // Đánh số thứ tự từng người trong server cùng tên (rn = 1, 2, 3…) rồi lấy (rn * 7919 + 13) mod 10000.
            // 7919 là số nguyên tố, không chia hết cho 2 hay 5 nên phép nhân này là song ánh trên 0–9999: trong một tên,
            // hai người khác nhau KHÔNG BAO GIỜ trùng ID (tới 10.000 người/tên) mà ID nhìn vẫn ngẫu nhiên.
            // Phải chạy TRƯỚC khi thu hẹp cột xuống 4 ký tự (nếu không dữ liệu 8 chữ số sẽ bị cắt / báo lỗi).
            migrationBuilder.Sql(@"
                UPDATE identity_users u
                JOIN (SELECT Id, ROW_NUMBER() OVER (PARTITION BY DisplayName ORDER BY CreatedAt, Id) AS rn FROM identity_users) t ON t.Id = u.Id
                SET u.UserCode = LPAD(MOD(t.rn * 7919 + 13, 10000), 4, '0');");

            migrationBuilder.AlterColumn<string>(
                name: "UserCode",
                table: "identity_users",
                type: "varchar(4)",
                maxLength: 4,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(12)",
                oldMaxLength: 12)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_identity_users_DisplayName_UserCode",
                table: "identity_users",
                columns: new[] { "DisplayName", "UserCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_identity_users_DisplayName_UserCode",
                table: "identity_users");

            migrationBuilder.AlterColumn<string>(
                name: "UserCode",
                table: "identity_users",
                type: "varchar(12)",
                maxLength: 12,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(4)",
                oldMaxLength: 4)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_identity_users_UserCode",
                table: "identity_users",
                column: "UserCode",
                unique: true);
        }
    }
}
