using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nebula.Organization.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInviteCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InviteCode",
                table: "org_servers",
                type: "varchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            // Server đã tồn tại trước migration này chưa có mã mời: sinh mã ngẫu nhiên 8 ký tự cho từng server
            // TRƯỚC khi tạo chỉ mục duy nhất (nếu không, các dòng cùng giá trị rỗng sẽ vi phạm UNIQUE).
            migrationBuilder.Sql("UPDATE org_servers SET InviteCode = UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 8)) WHERE InviteCode = '';");

            migrationBuilder.CreateIndex(
                name: "IX_org_servers_InviteCode",
                table: "org_servers",
                column: "InviteCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_org_servers_InviteCode",
                table: "org_servers");

            migrationBuilder.DropColumn(
                name: "InviteCode",
                table: "org_servers");
        }
    }
}
