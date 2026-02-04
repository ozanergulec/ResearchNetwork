using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResearchNetwork.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDOIAndFileUrlToPublication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DOI",
                table: "Publications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileUrl",
                table: "Publications",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DOI",
                table: "Publications");

            migrationBuilder.DropColumn(
                name: "FileUrl",
                table: "Publications");
        }
    }
}
