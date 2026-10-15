# WanderWise backend (ASP.NET Core .NET 10) for Railway.
# Railway builds this from the backend folder (Root Directory: /backend).

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY WanderWiseApi.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish WanderWiseApi.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
# Railway gives the port in $PORT; 8080 when running the image elsewhere.
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet WanderWiseApi.dll"]
