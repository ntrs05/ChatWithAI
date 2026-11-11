using Microsoft.EntityFrameworkCore;

namespace Nebula.Friends.Infrastructure;

// TODO: bảng friends_friendships (tên như ERD)
//       xong thì chạy dotnet ef migrations add InitialCreate
public sealed class FriendsDbContext(DbContextOptions<FriendsDbContext> options) : DbContext(options)
{
}

// TODO: GetAsync, GetByPairAsync, ListForUserAsync, AddAsync, Remove
internal sealed class EfFriendshipRepository
{
}
